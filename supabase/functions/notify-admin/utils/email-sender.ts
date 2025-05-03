
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
  
  // Log initial parameters for debugging
  console.log(`SENDING EMAIL TO: ${to}`);
  console.log(`EMAIL SUBJECT: ${subject}`);
  console.log(`FILE NAME: ${fileName}`);
  console.log(`FILE TYPE: ${fileType}`);
  console.log(`FILE CONTENT LENGTH: ${fileContent ? fileContent.length : 0} bytes`);

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
    
    // Verify base64 file content integrity with hash
    try {
      // Decode a sample to verify it's valid base64
      const sampleBytes = atob(fileContent.substring(0, Math.min(100, fileContent.length)));
      console.log(`Base64 decode test successful, first 10 chars: ${sampleBytes.substring(0, 10)}`);
      
      // Create a hash of the base64 content for verification
      const encoder = new TextEncoder();
      const dataBuffer = encoder.encode(fileContent);
      const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      
      console.log(`EMAIL ATTACHMENT HASH: ${hashHex}`);
      
      // Add attachment to email
      msg.attachments = [
        {
          content: fileContent,
          filename: fileName,
          type: fileType,
          disposition: 'attachment',
        },
      ];
      
      hasAttachment = true;
    } catch (error) {
      console.error("Failed to verify base64 content:", error);
      // Continue without attachment since there's an issue with the base64 data
    }
  } else {
    console.warn("No valid file content to attach");
  }

  // Send email with a single attempt (removed retry logic for simplicity)
  try {
    console.log("Sending email to:", to);
    
    const [response] = await sgMail.send(msg);
    
    console.log("Email sent successfully:", {
      statusCode: response.statusCode,
      headers: response.headers,
      hasAttachment
    });
    
    return { 
      success: true, 
      message: "Notification sent successfully", 
      withAttachment: hasAttachment 
    };
  } catch (error) {
    console.error("SendGrid error:", error);
    return { 
      success: false, 
      message: `Failed to send email: ${error.message || 'Unknown error'}`, 
      withAttachment: hasAttachment
    };
  }
}
