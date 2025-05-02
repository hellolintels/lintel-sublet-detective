
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
    console.log(`Attachment content length: ${fileContent.length}`);
    console.log(`Attachment content sample: ${fileContent.substring(0, 50)}...`);
    
    msg.attachments = [
      {
        content: fileContent,
        filename: fileName,
        type: fileType,
        disposition: 'attachment',
      },
    ];
    
    hasAttachment = true;
    
    // Generate simple hash for end-to-end verification
    const simpleHash = await generateSimpleHash(fileContent);
    console.log(`EMAIL ATTACHMENT INTEGRITY CHECK - File: ${fileName}`);
    console.log(`EMAIL ATTACHMENT INTEGRITY CHECK - Content Hash: ${simpleHash}`);
  } else {
    console.warn("No valid file content to attach");
  }

  // Send email with retry logic
  const maxRetries = 3;
  let retryCount = 0;
  let lastError = null;
  
  while (retryCount <= maxRetries) {
    try {
      if (retryCount > 0) {
        console.log(`Retry attempt ${retryCount} of ${maxRetries}...`);
        // Short delay between retries, increasing with each attempt
        await new Promise(resolve => setTimeout(resolve, 500 * retryCount));
      }
      
      console.log("Sending email to:", to);
      console.log("Email subject:", subject);
      console.log("Email has attachment:", hasAttachment);
      
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

// Simple function to generate a hash for end-to-end validation
async function generateSimpleHash(data: string): Promise<string> {
  try {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex.substring(0, 16); // Return first 16 chars of hash for brevity
  } catch (error) {
    console.error("Error generating hash:", error);
    return "hash_error";
  }
}
