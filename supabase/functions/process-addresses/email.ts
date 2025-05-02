
// Email handling module using SendGrid

/**
 * Email attachment interface
 */
interface EmailAttachment {
  filename: string;
  content: string;
  type: string;
  disposition?: string;
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
) {
  try {
    console.log(`===== SENDING EMAIL =====`);
    console.log(`TO: ${to}`);
    console.log(`SUBJECT: ${subject}`);
    console.log(`CONTENT LENGTH: ${htmlContent.length} characters`);
    
    // Validate recipient email
    if (!to || !to.includes('@')) {
      throw new Error(`Invalid recipient email: ${to}`);
    }
    
    // Enhanced logging for admin emails
    if (to === "jamie@lintels.in") {
      console.log(`CRITICAL ADMIN EMAIL TO: ${to}`);
      console.log(`Email sending attempt started at: ${new Date().toISOString()}`);
    }
    
    if (attachment) {
      console.log(`ATTACHMENT: ${attachment.filename} (${attachment.type})`);
      console.log(`ATTACHMENT CONTENT LENGTH: ${attachment.content ? attachment.content.length : 0} characters`);
      
      // Log the first few characters of the attachment content for debugging
      if (attachment.content && attachment.content.length > 0) {
        console.log(`ATTACHMENT CONTENT PREVIEW: ${attachment.content.substring(0, 20)}...`);
        
        // Verify the content is base64 encoded
        const base64Regex = /^[A-Za-z0-9+/=]*$/;
        if (!base64Regex.test(attachment.content)) {
          console.log("WARNING: Attachment content doesn't appear to be base64 encoded!");
          console.log("Re-encoding attachment content to base64...");
          try {
            attachment.content = btoa(unescape(encodeURIComponent(attachment.content)));
            console.log("Re-encoded attachment. New length:", attachment.content.length);
          } catch (e) {
            console.error("Failed to re-encode attachment content:", e);
            console.log("Sending email without attachment");
            attachment = undefined;
          }
        }
      } else {
        console.log(`ATTACHMENT CONTENT IS EMPTY OR INVALID`);
        attachment = undefined; // Don't include invalid attachments
      }
    }
    
    // Get the SendGrid API key from environment variables
    const sendgridApiKey = Deno.env.get("SENDGRID_API_KEY");
    
    if (!sendgridApiKey) {
      throw new Error("SendGrid API key is not configured");
    }
    
    // With domain authentication, any email on the verified domain can be used
    // Default to a standard notifications address if not specified
    const fromEmail = Deno.env.get("SENDGRID_FROM_EMAIL") || "notifications@lintels.in";
    const fromName = Deno.env.get("SENDGRID_FROM_NAME") || "Lintels";
    console.log(`Using sender: ${fromName} <${fromEmail}>`);
    
    // Add a timestamp to prevent email threading in some clients
    const timestampedSubject = `${subject} [${Date.now()}]`;
    
    // Prepare the email request body
    const emailBody: any = {
      personalizations: [
        {
          to: [{ email: to }]
        }
      ],
      from: { email: fromEmail, name: fromName },
      subject: timestampedSubject,
      content: [
        {
          type: "text/html",
          value: htmlContent
        }
      ]
    };
    
    // Add attachment if provided and content is valid
    if (attachment && attachment.content) {
      console.log(`Adding attachment: ${attachment.filename}`);
      emailBody.attachments = [
        {
          filename: attachment.filename,
          content: attachment.content,
          type: attachment.type,
          disposition: attachment.disposition || "attachment"
        }
      ];
    }
    
    // Log entire request for debugging admin emails
    if (to === "jamie@lintels.in") {
      console.log("ADMIN EMAIL REQUEST BODY:", JSON.stringify({
        ...emailBody,
        attachments: emailBody.attachments ? [{
          filename: emailBody.attachments[0].filename,
          type: emailBody.attachments[0].type,
          content_length: emailBody.attachments[0].content?.length || 0,
          content_preview: emailBody.attachments[0].content?.substring(0, 20) + '...' || 'empty'
        }] : []
      }));
    }
    
    // Prepare the SendGrid request with comprehensive error handling
    console.log("Sending email via SendGrid API...");
    let response;
    
    // Implement retry logic
    const maxRetries = 2;
    let retryCount = 0;
    let lastError = null;
    
    while (retryCount <= maxRetries) {
      try {
        if (retryCount > 0) {
          console.log(`Retry attempt ${retryCount} of ${maxRetries}...`);
          // Short delay between retries, increasing with each attempt
          await new Promise(resolve => setTimeout(resolve, 500 * retryCount));
        }
        
        response = await fetch("https://api.sendgrid.com/v3/mail/send", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${sendgridApiKey}`
          },
          body: JSON.stringify(emailBody)
        });
        
        console.log(`SendGrid API Response Status: ${response.status}`);
        
        if (response.ok) {
          // Success! Break out of retry loop
          break;
        }
        
        // If we're here, response wasn't ok - prepare error details
        let errorDetails = "Unknown error";
        try {
          const errorText = await response.text();
          console.error(`SendGrid API error: ${errorText}`);
          errorDetails = errorText;
        } catch (e) {
          console.error("Could not retrieve error details:", e);
        }
        
        lastError = new Error(`SendGrid API returned ${response.status}: ${errorDetails}`);
        
        // Continue to next retry attempt
        retryCount++;
      } catch (fetchError) {
        console.error("Error during SendGrid API call:", fetchError);
        lastError = fetchError;
        retryCount++;
      }
    }
    
    // If we've exhausted retries and still have an error
    if (!response || !response.ok) {
      throw lastError || new Error("Failed to send email after multiple attempts");
    }
    
    // Special handling for admin emails to ensure delivery
    if (to === "jamie@lintels.in") {
      const emailId = `admin_email_${Date.now()}`;
      console.log(`ADMIN EMAIL TRACKING ID: ${emailId}`);
      console.log(`ADMIN EMAIL ${emailId} - SendGrid Response Status: ${response.status}`);
      console.log(`ADMIN EMAIL ${emailId} - Sent at: ${new Date().toISOString()}`);
    }
    
    return { 
      success: true, 
      messageId: `sendgrid_${Date.now()}`,
      recipient: to,
      subject: subject
    };
  } catch (error) {
    console.error("===== EMAIL SENDING FAILED =====");
    console.error(`Failed to send email to: ${to}`);
    console.error(`Subject: ${subject}`);
    console.error("Error details:", error);
    
    // For important emails, make a second attempt with simplified content
    if (to === "jamie@lintels.in") {
      console.log("Admin email failed, attempting simplified retry...");
      try {
        // Prepare the retry email body with minimal HTML and no attachments
        const retryEmailBody: any = {
          personalizations: [
            {
              to: [{ email: to }]
            }
          ],
          from: { 
            email: Deno.env.get("SENDGRID_FROM_EMAIL") || "notifications@lintels.in", 
            name: "Lintels URGENT" 
          },
          subject: `${subject} [RETRY ${Date.now()}]`,
          content: [
            {
              type: "text/html",
              value: `<p>This is a simplified retry email after a failure.</p><p>Original subject: ${subject}</p><p>Please check the admin dashboard for details.</p>`
            }
          ]
        };
        
        // Send the retry email
        const retryResponse = await fetch("https://api.sendgrid.com/v3/mail/send", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${Deno.env.get("SENDGRID_API_KEY") || ""}`
          },
          body: JSON.stringify(retryEmailBody)
        });
        
        console.log("Admin email retry status:", retryResponse.status);
        
        if (retryResponse.ok) {
          return { 
            success: true, 
            messageId: `sendgrid_retry_${Date.now()}`,
            recipient: to,
            subject: subject,
            note: "Sent with simplified content after initial failure"
          };
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
