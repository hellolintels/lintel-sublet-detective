
import sgMail from 'https://esm.sh/@sendgrid/mail@7';

/**
 * Sends an email via SendGrid with attachment handling and retry logic
 * @param to Recipient email address
 * @param subject Email subject
 * @param htmlContent HTML content for the email
 * @param textContent Plain text content for the email
 * @param fileContent Base64 encoded file content
 * @param fileName Name of the attachment file
 * @param fileType MIME type of the attachment
 * @returns Object with success status and messages
 */
export async function sendEmail(
  to: string,
  subject: string,
  htmlContent: string,
  textContent: string,
  fileContent: string,
  fileName: string,
  fileType: string
): Promise<{ success: boolean, message: string, withAttachment: boolean }> {
  // Configure SendGrid
  sgMail.setApiKey(Deno.env.get('SENDGRID_API_KEY')!);

  // Prepare the email message
  const msg: any = {
    to,
    from: 'notifications@lintels.in',
    subject,
    html: htmlContent,
    text: textContent,
  };

  // Add attachment if we have valid file content
  let hasAttachment = false;
  if (fileContent && fileContent.length > 0) {
    console.log(`Adding attachment: ${fileName}`);
    
    msg.attachments = [
      {
        content: fileContent,
        filename: fileName,
        type: fileType,
        disposition: 'attachment',
      },
    ];
    
    hasAttachment = true;
    
    // Log attachment details for debugging
    console.log("Attachment details:", {
      filename: fileName,
      type: fileType,
      contentLength: fileContent.length,
      contentSample: fileContent.substring(0, 20) + '...'
    });
  } else {
    console.warn("No valid file content to attach");
  }

  // Send email with retry logic
  const maxRetries = 3;
  let retryCount = 0;
  let lastError = null;
  
  while (retryCount <= maxRetries) {
    try {
      console.log(`Sending email${retryCount > 0 ? ` (retry ${retryCount})` : ''}`);
      const [response] = await sgMail.send(msg);
      
      console.log("Email sent successfully:", {
        statusCode: response.statusCode,
        headers: response.headers,
        hasAttachment
      });
      
      // Return success response
      return { 
        success: true, 
        message: "Notification sent successfully", 
        withAttachment: hasAttachment 
      };
    } catch (error) {
      lastError = error;
      console.error(`SendGrid error (attempt ${retryCount + 1}):`, error);
      
      // If we've reached max retries and we have an attachment, try without it
      if (retryCount === maxRetries - 1 && msg.attachments) {
        console.log("Trying final attempt without attachment");
        delete msg.attachments;
        hasAttachment = false;
      }
      
      retryCount++;
      if (retryCount <= maxRetries) {
        // Short delay between retries
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }

  // If we're here, all retries failed
  return { 
    success: false, 
    message: `Failed to send email after ${maxRetries} attempts: ${lastError?.message || 'Unknown error'}`, 
    withAttachment: hasAttachment
  };
}
