
import sgMail from 'https://esm.sh/@sendgrid/mail@7';

/**
 * Sends an email via SendGrid with attachment handling
 * @param to Recipient email address
 * @param subject Email subject
 * @param htmlContent HTML content for the email
 * @param textContent Plain text content for the email
 * @param fileContent Plain text file content for attachment
 * @param fileName Name of the attachment file
 * @param fileType MIME type of the attachment
 * @returns Promise that resolves when the email is sent
 */
export async function sendEmail(
  to: string,
  subject: string,
  htmlContent: string,
  textContent: string,
  fileContent: string,
  fileName: string,
  fileType: string
): Promise<{ success: boolean, message: string }> {
  // Configure SendGrid
  const sendgridApiKey = Deno.env.get('SENDGRID_API_KEY');
  if (!sendgridApiKey) {
    console.error('SendGrid API key not configured');
    return { success: false, message: 'SendGrid API key not configured' };
  }
  
  sgMail.setApiKey(sendgridApiKey);
  
  // Log initial parameters for debugging
  console.log(`SENDING EMAIL TO: ${to}`);
  console.log(`EMAIL SUBJECT: ${subject}`);
  console.log(`FILE NAME: ${fileName}`);
  console.log(`FILE TYPE: ${fileType}`);
  console.log(`FILE CONTENT LENGTH: ${fileContent ? fileContent.length : 0} bytes`);

  if (fileContent) {
    console.log(`FILE CONTENT SAMPLE: ${fileContent.substring(0, 100)}...`);
  }

  // Prepare the email message
  const msg: any = {
    to,
    from: 'notifications@lintels.in',
    subject,
    html: htmlContent,
    text: textContent
  };

  // Add attachment if we have file content
  if (fileContent) {
    msg.attachments = [{
      content: fileContent,
      filename: fileName,
      type: fileType || 'text/csv',
      disposition: 'attachment',
      // For plain text CSV, use 7bit encoding (standard for ASCII text)
      contentTransferEncoding: '7bit'
    }];
  }

  try {
    console.log("Sending email with SendGrid");
    const [response] = await sgMail.send(msg);
    
    console.log("Email sent successfully:", {
      statusCode: response.statusCode,
      headers: response.headers
    });
    
    return { 
      success: true, 
      message: "Email sent successfully" 
    };
  } catch (error) {
    console.error("SendGrid error:", error);
    return { 
      success: false, 
      message: `Failed to send email: ${error.message || 'Unknown error'}`
    };
  }
}
