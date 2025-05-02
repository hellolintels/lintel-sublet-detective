
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
    console.log(`CONTENT PREVIEW: ${htmlContent.substring(0, 100)}...`);
    
    // Validate recipient email
    if (!to || !to.includes('@')) {
      throw new Error(`Invalid recipient email: ${to}`);
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
    } else {
      console.log(`ATTACHMENT: None`);
    }
    
    // Get the SendGrid API key from environment variables
    const sendgridApiKey = Deno.env.get("SENDGRID_API_KEY");
    
    if (!sendgridApiKey) {
      throw new Error("SendGrid API key is not configured");
    }
    
    // With domain authentication, any email on the verified domain can be used
    // Default to a standard notifications address if not specified
    const fromEmail = Deno.env.get("SENDGRID_FROM_EMAIL") || "notifications@lintels.in";
    console.log(`Using sender email: ${fromEmail}`);
    
    // Prepare the email request body
    const emailBody: any = {
      personalizations: [
        {
          to: [{ email: to }]
        }
      ],
      from: { email: fromEmail, name: "Lintels" },
      subject: subject,
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
    
    // Prepare the SendGrid request
    const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${sendgridApiKey}`
      },
      body: JSON.stringify(emailBody)
    });
    
    // If the response is not successful, attempt to get more details
    if (!response.ok) {
      let errorDetails = "Unknown error";
      try {
        const errorText = await response.text();
        console.error("SendGrid API error:", errorText);
        errorDetails = errorText;
      } catch (e) {
        console.error("Could not retrieve error details:", e);
      }
      
      throw new Error(`SendGrid API returned ${response.status}: ${errorDetails}`);
    }
    
    // Special handling for admin emails to ensure delivery
    if (to === "jamie@lintels.in") {
      console.log(`CRITICAL ADMIN EMAIL TO: ${to}`);
      console.log(`ADMIN EMAIL SUBJECT: ${subject}`);
      
      // Generate a unique tracking ID for this admin email
      const emailId = `admin_email_${Date.now()}`;
      console.log(`ADMIN EMAIL TRACKING ID: ${emailId}`);
      
      console.log(`ADMIN EMAIL ${emailId} - SendGrid Response Status: ${response.status}`);
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
          from: { email: Deno.env.get("SENDGRID_FROM_EMAIL") || "notifications@lintels.in", name: "Lintels URGENT" },
          subject: `${subject} [RETRY]`,
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
