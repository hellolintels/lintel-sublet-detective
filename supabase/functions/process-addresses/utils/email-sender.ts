
import sgMail from "https://esm.sh/@sendgrid/mail@7";
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
 * @param emailBody Prepared email body for SendGrid
 * @param maxRetries Maximum number of retry attempts
 * @returns Response object if successful, or null if all attempts fail
 */
async function sendWithRetries(
  to: string, 
  subject: string, 
  htmlContent: string, 
  emailBody: any, 
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
      
      // Use SendGrid SDK instead of raw fetch
      sgMail.setApiKey(sendgridApiKey);
      const result = await sgMail.send(emailBody);
      
      // Create a response-like object from the result
      response = new Response(JSON.stringify({ 
        status: "success",
        statusCode: result[0]?.statusCode || 202,
        headers: result[0]?.headers || {}
      }), { status: 200 });
      
      logSendGridResponse(to, response);
      
      if (result[0]?.statusCode >= 200 && result[0]?.statusCode < 300) {
        // Success! Break out of retry loop
        return response;
      }
      
      // If we're here, response wasn't ok - prepare error details
      let errorDetails = `SendGrid returned status code: ${result[0]?.statusCode}`;
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
 * Enhanced email sending function with SendGrid integration
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
    
    // Prepare the email request body for SendGrid SDK
    const emailBody = {
      to,
      from: {
        email: 'hello@lintels.in',  // Updated sender address
        name: 'Lintels.in'
      },
      subject,
      html: htmlContent,
      text: htmlContent.replace(/<[^>]*>?/gm, ''),
      attachments: cleanedAttachment ? [{
        content: cleanedAttachment.content,
        filename: cleanedAttachment.filename,
        type: cleanedAttachment.contentType,
        disposition: 'attachment'
      }] : undefined
    };
    
    // Send the email with retry logic
    const response = await sendWithRetries(to, subject, htmlContent, emailBody);
    
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
        // Prepare the retry email body with minimal HTML and no attachments
        const retryEmailBody = {
          to,
          from: {
            email: 'hello@lintels.in',
            name: 'Lintels.in (Retry)'
          },
          subject: `[RETRY] ${subject}`,
          text: `This is a retry of a failed email. Original subject: ${subject}`,
          html: `<p>This is a retry of a failed email.</p><p><strong>Original subject:</strong> ${subject}</p>`
        };
        
        // Send using the SDK directly
        sgMail.setApiKey(Deno.env.get("SENDGRID_API_KEY") || "");
        await sgMail.send(retryEmailBody);
        
        console.log("Admin email retry sent successfully");
        
        return { 
          success: true, 
          messageId: `sendgrid_retry_${Date.now()}`,
          recipient: to,
          subject: subject,
          note: "Sent with simplified content after initial failure"
        };
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
