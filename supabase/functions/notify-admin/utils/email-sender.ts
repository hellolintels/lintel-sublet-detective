
import sgMail from 'https://esm.sh/@sendgrid/mail@7';

/**
 * Sends an email via SendGrid with attachment handling
 * @param to Recipient email address
 * @param subject Email subject
 * @param htmlContent HTML content for the email
 * @param textContent Plain text content for the email
 * @param fileContent Base64 encoded file content
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
  sgMail.setApiKey(Deno.env.get('SENDGRID_API_KEY')!);
  
  // Log initial parameters for debugging
  console.log(`SENDING EMAIL TO: ${to}`);
  console.log(`EMAIL SUBJECT: ${subject}`);
  console.log(`FILE NAME: ${fileName}`);
  console.log(`FILE TYPE: ${fileType}`);
  console.log(`FILE CONTENT LENGTH: ${fileContent ? fileContent.length : 0} bytes`);

  // Calculate content hash for verification
  const sampleBytes = fileContent.substring(0, Math.min(100, fileContent.length));
  console.log(`Base64 content sample (first 20 chars): ${sampleBytes.substring(0, 20)}...`);

  // Prepare the email message
  const msg = {
    to,
    from: 'notifications@lintels.in',
    subject,
    html: htmlContent,
    text: textContent,
    attachments: [
      {
        content: fileContent,
        filename: fileName,
        type: fileType,
        disposition: 'attachment',
      },
    ],
  };

  try {
    console.log("Sending email to:", to);
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
