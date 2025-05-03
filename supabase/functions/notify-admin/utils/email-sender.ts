
// Direct implementation of SendGrid API using fetch
// This avoids using the Node.js SDK which isn't compatible with Deno

/**
 * Sends an email via SendGrid API with attachment handling and improved error handling
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
  fileContent?: string,
  fileName?: string,
  fileType?: string
): Promise<{ success: boolean, message: string }> {
  // Get SendGrid API key
  const sendgridApiKey = Deno.env.get('SENDGRID_API_KEY');
  if (!sendgridApiKey) {
    console.error('SendGrid API key not configured');
    return { success: false, message: 'SendGrid API key not configured' };
  }
  
  // Add a timestamp to the subject to prevent threading in email clients
  const timestampedSubject = `${subject} [${new Date().toISOString()}]`;
  
  // Log initial parameters for debugging
  console.log(`--------------------------------`);
  console.log(`SENDING EMAIL TO: ${to}`);
  console.log(`EMAIL SUBJECT: ${timestampedSubject}`);
  console.log(`FILE NAME: ${fileName || 'N/A'}`);
  console.log(`FILE TYPE: ${fileType || 'N/A'}`);
  console.log(`FILE CONTENT LENGTH: ${fileContent ? fileContent.length : 0} bytes`);

  if (fileContent) {
    console.log(`FILE CONTENT SAMPLE: ${fileContent.substring(0, 100)}...`);
  }

  // Try up to 3 times to send the email
  let lastError = null;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      console.log(`Email send attempt ${attempt} to ${to}`);
      
      // Special handling for known critical destinations
      const isAdminEmail = to.includes('jamie@lintels.in');
      if (isAdminEmail) {
        console.log(`CRITICAL ADMIN EMAIL DETECTED: ${to} - Adding extra tracking info`);
        subject = `[IMPORTANT] ${timestampedSubject}`; // Mark admin emails as important
      }
      
      // Prepare the SendGrid API payload
      const payload: any = {
        personalizations: [
          {
            to: [{ email: to }]
          }
        ],
        from: {
          email: 'hello@lintels.in',
          name: 'Lintels.in Notifications'
        },
        subject: timestampedSubject,
        content: [
          {
            type: 'text/html',
            value: htmlContent
          },
          {
            type: 'text/plain', 
            value: textContent
          }
        ]
      };

      // Add attachment if we have file content
      if (fileContent) {
        console.log(`Adding file attachment to email, attempt ${attempt}`);
        
        // Use TextEncoder to convert string to Uint8Array
        const encoder = new TextEncoder();
        const uint8Array = encoder.encode(fileContent);
        
        // Convert to base64 using btoa for Deno environment
        const base64Content = btoa(
          String.fromCharCode.apply(null, Array.from(uint8Array))
        );
        
        payload.attachments = [{
          content: base64Content,
          filename: fileName || 'attachment.csv',
          type: fileType || 'text/csv',
          disposition: 'attachment'
        }];
      }

      console.log(`Sending email with direct SendGrid API call, attempt ${attempt}`);
      console.log("Email configuration:", JSON.stringify({
        to,
        from: payload.from,
        subject: timestampedSubject,
        htmlContentLength: htmlContent.length,
        textContentLength: textContent.length,
        hasAttachment: !!fileContent,
        attachmentFilename: fileName
      }));
      
      // Direct API call to SendGrid
      const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${sendgridApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });
      
      // Check response status
      if (response.ok) {
        console.log(`Email sent successfully on attempt ${attempt}:`, {
          status: response.status,
          statusText: response.statusText
        });
        
        // For admin emails, send a backup notification to another address
        if (isAdminEmail) {
          try {
            const backupPayload = {
              personalizations: [
                {
                  to: [{ email: 'support@lintels.in' }]
                }
              ],
              from: {
                email: 'hello@lintels.in',
                name: 'Lintels.in Notifications (Backup)'
              },
              subject: `BACKUP: ${timestampedSubject}`,
              content: [
                {
                  type: 'text/html',
                  value: `<p>This is a backup notification for an email sent to ${to}.</p>${htmlContent}`
                },
                {
                  type: 'text/plain',
                  value: `This is a backup notification for an email sent to ${to}.\n\n${textContent}`
                }
              ]
            };
            
            await fetch('https://api.sendgrid.com/v3/mail/send', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${sendgridApiKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(backupPayload)
            });
            console.log(`Backup notification sent to support@lintels.in`);
          } catch (backupError) {
            console.error(`Failed to send backup notification:`, backupError);
            // Don't fail the main operation if backup fails
          }
        }
        
        return { 
          success: true, 
          message: `Email sent successfully on attempt ${attempt}` 
        };
      } else {
        // Extract error details from SendGrid response
        const errorText = await response.text();
        console.error(`SendGrid API error response (${response.status}): ${errorText}`);
        lastError = new Error(`SendGrid API returned status ${response.status}: ${errorText}`);
        
        // Only retry for certain types of errors (e.g., 5xx errors)
        if (response.status >= 500 && attempt < 3) {
          console.log(`Waiting before retry attempt ${attempt + 1}...`);
          // Wait before retry with exponential backoff
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        } else if (response.status < 500) {
          // Don't retry for 4xx errors
          break;
        }
      }
    } catch (error) {
      console.error(`SendGrid fetch error on attempt ${attempt}:`, error);
      lastError = error;
      
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
