
import sgMail from 'https://esm.sh/@sendgrid/mail@7';

/**
 * Sends an email via SendGrid with attachment handling and improved error handling
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
  console.log(`--------------------------------`);
  console.log(`SENDING EMAIL TO: ${to}`);
  console.log(`EMAIL SUBJECT: ${subject}`);
  console.log(`FILE NAME: ${fileName}`);
  console.log(`FILE TYPE: ${fileType}`);
  console.log(`FILE CONTENT LENGTH: ${fileContent ? fileContent.length : 0} bytes`);

  if (fileContent) {
    console.log(`FILE CONTENT SAMPLE: ${fileContent.substring(0, 100)}...`);
  }

  // Try up to 3 times to send the email
  let lastError = null;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      console.log(`Email send attempt ${attempt} to ${to}`);
      
      // Prepare the email message with a simpler structure
      const msg: any = {
        to,
        from: {
          email: 'notifications@lintels.in',
          name: 'Lintels.in Notifications'
        },
        subject: `${subject} [${new Date().toISOString()}]`, // Add timestamp to prevent threading
        html: htmlContent,
        text: textContent
      };

      // Add attachment if we have file content
      if (fileContent) {
        console.log(`Adding file attachment to email, attempt ${attempt}`);
        
        // For CSV files, use plain content
        msg.attachments = [{
          content: fileContent,
          filename: fileName,
          type: fileType || 'text/csv',
          disposition: 'attachment'
        }];
      }

      console.log(`Sending email with SendGrid, attempt ${attempt}`);
      console.log("Email configuration:", JSON.stringify({
        to,
        from: msg.from,
        subject,
        htmlContentLength: htmlContent.length,
        textContentLength: textContent.length,
        hasAttachment: !!fileContent,
        attachmentFilename: fileName
      }));
      
      const [response] = await sgMail.send(msg);
      
      console.log(`Email sent successfully on attempt ${attempt}:`, {
        statusCode: response.statusCode,
        headers: response.headers
      });
      
      return { 
        success: true, 
        message: `Email sent successfully on attempt ${attempt}` 
      };
    } catch (error) {
      console.error(`SendGrid error on attempt ${attempt}:`, error);
      console.error("Error details:", JSON.stringify(error));
      lastError = error;
      
      // Only retry for certain types of errors
      if (attempt < 3) {
        console.log(`Waiting before retry attempt ${attempt + 1}...`);
        // Wait before retry with exponential backoff
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
  }
  
  // All attempts failed
  return { 
    success: false, 
    message: `Failed to send email after 3 attempts: ${lastError?.message || 'Unknown error'}`
  };
}
