
import { EmailAttachment, EmailSendResult } from "./email-types.ts";
import { 
  logEmailDetails, 
  logSendGridResponse, 
  logSendingFailure 
} from "./email-logging.ts";
import { 
  cleanAttachmentContent,
  prepareEmailBody,
  prepareAdminRetryEmailBody
} from "./email-builder.ts";

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
    throw new Error("SendGrid API key is not configured");
  }
  
  let retryCount = 0;
  let lastError: Error | null = null;
  let response: Response | null = null;
  
  while (retryCount <= maxRetries) {
    try {
      if (retryCount > 0) {
        console.log(`Retry attempt ${retryCount} of ${maxRetries}...`);
        // Short delay between retries, increasing with each attempt
        await new Promise(resolve => setTimeout(resolve, 500 * retryCount));
      }
      
      // Direct API call to SendGrid
      response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${sendgridApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(emailPayload)
      });
      
      logSendGridResponse(to, response);
      
      if (response.ok) {
        // Success! Break out of retry loop
        return response;
      }
      
      // If we're here, response wasn't ok - prepare error details
      const errorText = await response.text();
      let errorDetails = `SendGrid returned status code: ${response.status}, body: ${errorText}`;
      lastError = new Error(errorDetails);
      
      // Continue to next retry attempt
      retryCount++;
    } catch (fetchError) {
      console.error("Error during SendGrid API call:", fetchError);
      lastError = fetchError instanceof Error ? fetchError : new Error(String(fetchError));
      retryCount++;
    }
  }
  
  // If we've exhausted retries and still have an error
  if (lastError) {
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
  try {
    logEmailDetails(to, subject, htmlContent.length, attachment);
    
    // Validate recipient email
    if (!to || !to.includes('@')) {
      throw new Error(`Invalid recipient email: ${to}`);
    }
    
    // Clean up the attachment content
    const cleanedAttachment = cleanAttachmentContent(attachment);
    
    // Prepare the email payload for SendGrid API
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
          type: 'text/html',
          value: htmlContent
        },
        {
          type: 'text/plain',
          value: htmlContent.replace(/<[^>]*>?/gm, '')
        }
      ]
    };
    
    // Add attachment if provided
    if (cleanedAttachment) {
      emailPayload.attachments = [{
        content: cleanedAttachment.content,
        filename: cleanedAttachment.filename,
        type: cleanedAttachment.contentType,
        disposition: 'attachment'
      }];
    }
    
    // Send the email with retry logic
    const response = await sendWithRetries(to, subject, htmlContent, emailPayload);
    
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
    logSendingFailure(to, subject, error);
    
    // For important emails, make a second attempt with simplified content
    if (to === "jamie@lintels.in") {
      console.log("Admin email failed, attempting simplified retry...");
      try {
        // Prepare the retry email payload with minimal HTML and no attachments
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
              type: 'text/html',
              value: `<p>This is a retry of a failed email.</p><p><strong>Original subject:</strong> ${subject}</p>`
            },
            {
              type: 'text/plain',
              value: `This is a retry of a failed email. Original subject: ${subject}`
            }
          ]
        };
        
        // Send directly without attachments
        const sendgridApiKey = Deno.env.get("SENDGRID_API_KEY");
        if (!sendgridApiKey) {
          throw new Error("SendGrid API key not found for retry");
        }
        
        const retryResponse = await fetch('https://api.sendgrid.com/v3/mail/send', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${sendgridApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(retryEmailPayload)
        });
        
        if (retryResponse.ok) {
          console.log("Admin email retry sent successfully");
          
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
        console.error("Admin email retry also failed:", retryError);
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
