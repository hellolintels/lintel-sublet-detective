
import { EmailAttachment, EmailSendResult } from "./email-types.ts";
import { createLogger } from "../../_shared/debug-logger.ts";
import { trackedFetch } from "../../_shared/api-telemetry.ts";
import { 
  cleanAttachmentContent,
  prepareEmailBody,
  prepareAdminRetryEmailBody
} from "./email-builder.ts";

// Create module-specific logger
const logger = createLogger({ module: 'email-sender' });

/**
 * Sends an email using SendGrid API with retries
 * @param to Email address of the recipient
 * @param subject Subject line of the email
 * @param htmlContent HTML content of the email
 * @param emailPayload Prepared email payload for SendGrid API
 * @param maxRetries Maximum number of retry attempts
 * @returns Response object if successful, or null if all attempts fail
 */
async function sendWithRetries(
  to: string, 
  subject: string, 
  htmlContent: string, 
  emailPayload: any, 
  maxRetries: number = 2
): Promise<Response | null> {
  // Get the SendGrid API key from environment variables
  const sendgridApiKey = Deno.env.get("SENDGRID_API_KEY");
  
  if (!sendgridApiKey) {
    logger.error("SendGrid API key is not configured");
    throw new Error("SendGrid API key is not configured");
  }
  
  let retryCount = 0;
  let lastError: Error | null = null;
  let response: Response | null = null;
  
  while (retryCount <= maxRetries) {
    try {
      if (retryCount > 0) {
        logger.info(`Retry attempt ${retryCount} of ${maxRetries}...`);
        // Short delay between retries, increasing with each attempt
        await new Promise(resolve => setTimeout(resolve, 500 * retryCount));
      }
      
      // Track the API call to SendGrid
      response = await trackedFetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${sendgridApiKey}`,
          'Content-Type': 'application/json',
        },
        body: emailPayload,
        retries: 0, // We're handling retries manually here
        sensitiveHeaders: ['Authorization'],
        sensitiveBodyFields: ['personalizations', 'from', 'content'] // Redact email content in logs
      });
      
      logger.info(`SendGrid API response status: ${response.status}`);
      
      if (response.ok) {
        // Success! Break out of retry loop
        return response;
      }
      
      // If we're here, response wasn't ok - prepare error details
      const errorText = await response.text();
      logger.warn(`SendGrid returned non-OK status: ${response.status}`, { 
        responseText: errorText
      });
      
      let errorDetails = `SendGrid returned status code: ${response.status}, body: ${errorText}`;
      lastError = new Error(errorDetails);
      
      // Continue to next retry attempt
      retryCount++;
    } catch (fetchError) {
      logger.error("Error during SendGrid API call:", fetchError);
      lastError = fetchError instanceof Error ? fetchError : new Error(String(fetchError));
      retryCount++;
    }
  }
  
  // If we've exhausted retries and still have an error
  if (lastError) {
    logger.error("Email sending failed after all retry attempts", { error: lastError });
    throw lastError;
  }
  
  return null;
}

/**
 * Enhanced email sending function with SendGrid API integration
 * @param to Email address of the recipient
 * @param subject Subject line of the email
 * @param htmlContent HTML content of the email
 * @param attachment Optional file attachment (base64 encoded)
 * @returns Object indicating success or failure
 */
export async function sendEmail(
  to: string, 
  subject: string, 
  htmlContent: string,
  attachment?: EmailAttachment
): Promise<EmailSendResult> {
  const emailLog = logger.child({ 
    module: `email-${to.includes('@lintels.in') ? 'admin' : 'client'}`
  });
  
  try {
    emailLog.info(`Preparing to send email: "${subject}" to ${to}`);
    emailLog.debug(`Email content length: ${htmlContent.length} chars`, {
      hasAttachment: !!attachment,
      attachmentName: attachment?.filename
    });
    
    // Validate recipient email
    if (!to || !to.includes('@')) {
      throw new Error(`Invalid recipient email: ${to}`);
    }
    
    // Clean up the attachment content
    const cleanedAttachment = attachment ? cleanAttachmentContent(attachment) : null;
    
    // Create a plain text version of the HTML content
    const plainTextContent = htmlContent.replace(/<[^>]*>?/gm, '');
    
    // Prepare the email payload for SendGrid API - IMPORTANT: text/plain must be the first content type
    const emailPayload: any = {
      personalizations: [
        {
          to: [{ email: to }]
        }
      ],
      from: {
        email: 'hello@lintels.in',
        name: 'Lintels.in'
      },
      subject: subject,
      content: [
        {
          type: 'text/plain',
          value: plainTextContent
        },
        {
          type: 'text/html',
          value: htmlContent
        }
      ]
    };
    
    // Add attachment if provided
    if (cleanedAttachment) {
      emailLog.debug(`Adding attachment: ${cleanedAttachment.filename}`, { 
        contentLength: cleanedAttachment.content?.length || 0
      });
      
      emailPayload.attachments = [{
        content: cleanedAttachment.content,
        filename: cleanedAttachment.filename,
        type: cleanedAttachment.contentType,
        disposition: 'attachment'
      }];
    }
    
    // Send the email with retry logic
    emailLog.info(`Sending email to ${to}`);
    const startTime = performance.now();
    
    const response = await sendWithRetries(to, subject, htmlContent, JSON.stringify(emailPayload));
    
    const duration = performance.now() - startTime;
    emailLog.info(`Email sent successfully in ${duration.toFixed(2)}ms`);
    
    // If we've exhausted retries and still don't have a successful response
    if (!response) {
      throw new Error("Failed to send email after multiple attempts");
    }
    
    return { 
      success: true, 
      messageId: `sendgrid_${Date.now()}`,
      recipient: to,
      subject: subject
    };
    
  } catch (error) {
    emailLog.error(`Failed to send email to ${to}`, { 
      subject,
      error: error instanceof Error ? error.message : String(error)
    });
    
    // For important emails, make a second attempt with simplified content
    if (to === "jamie@lintels.in") {
      emailLog.info("Admin email failed, attempting simplified retry...");
      try {
        // Prepare the retry email payload with minimal HTML and no attachments
        const plainRetryText = `This is a retry of a failed email. Original subject: ${subject}`;
        const htmlRetryText = prepareAdminRetryEmailBody(subject);
        
        const retryEmailPayload = {
          personalizations: [
            {
              to: [{ email: to }]
            }
          ],
          from: {
            email: 'hello@lintels.in',
            name: 'Lintels.in (Retry)'
          },
          subject: `[RETRY] ${subject}`,
          content: [
            {
              type: 'text/plain',
              value: plainRetryText
            },
            {
              type: 'text/html',
              value: htmlRetryText
            }
          ]
        };
        
        emailLog.info("Attempting admin email retry with simplified content");
        
        // Send directly without attachments
        const sendgridApiKey = Deno.env.get("SENDGRID_API_KEY");
        if (!sendgridApiKey) {
          throw new Error("SendGrid API key not found for retry");
        }
        
        const retryResponse = await trackedFetch('https://api.sendgrid.com/v3/mail/send', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${sendgridApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(retryEmailPayload),
          sensitiveHeaders: ['Authorization']
        });
        
        if (retryResponse.ok) {
          emailLog.info("Admin email retry sent successfully");
          
          return { 
            success: true, 
            messageId: `sendgrid_retry_${Date.now()}`,
            recipient: to,
            subject: subject,
            note: "Sent with simplified content after initial failure"
          };
        } else {
          throw new Error(`Retry also failed with status: ${retryResponse.status}`);
        }
      } catch (retryError) {
        emailLog.error("Admin email retry also failed:", retryError);
      }
    }
    
    return { 
      success: false, 
      error: error instanceof Error ? error.message : String(error),
      recipient: to,
      subject: subject
    };
  }
}
