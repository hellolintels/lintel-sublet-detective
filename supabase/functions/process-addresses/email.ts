
// Email handling module using SendGrid

/**
 * Email attachment interface
 */
interface EmailAttachment {
  filename: string;
  content: string;
  type: string;
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
    console.log(`ATTACHMENT: ${attachment ? `${attachment.filename} (${attachment.type})` : 'None'}`);
    
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
    
    // Add attachment if provided
    if (attachment) {
      console.log(`Adding attachment: ${attachment.filename}`);
      emailBody.attachments = [
        {
          filename: attachment.filename,
          content: attachment.content,
          type: attachment.type,
          disposition: "attachment"
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
    
    // Special handling for admin emails to ensure delivery
    if (to === "jamie@lintels.in") {
      console.log(`CRITICAL ADMIN EMAIL TO: ${to}`);
      console.log(`ADMIN EMAIL SUBJECT: ${subject}`);
      
      // Generate a unique tracking ID for this admin email
      const emailId = `admin_email_${Date.now()}`;
      console.log(`ADMIN EMAIL TRACKING ID: ${emailId}`);
      
      // Log the SendGrid response status for admin emails
      console.log(`ADMIN EMAIL ${emailId} - SendGrid Response Status: ${response.status}`);
      
      // If the response is not successful, retry once more
      if (!response.ok) {
        console.log(`ADMIN EMAIL ${emailId} - First attempt failed with status ${response.status}, retrying...`);
        
        // Wait 2 seconds before retrying
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Prepare retry email body with attachment if provided
        const retryEmailBody: any = {
          personalizations: [
            {
              to: [{ email: to }]
            }
          ],
          from: { email: fromEmail, name: "Lintels URGENT" },
          subject: `${subject} [RETRY]`,
          content: [
            {
              type: "text/html",
              value: htmlContent
            }
          ]
        };
        
        // Add attachment to retry if provided
        if (attachment) {
          console.log(`Adding attachment to retry: ${attachment.filename}`);
          retryEmailBody.attachments = [
            {
              filename: attachment.filename,
              content: attachment.content,
              type: attachment.type,
              disposition: "attachment"
            }
          ];
        }
        
        // Retry the request with the same verified sender
        const retryResponse = await fetch("https://api.sendgrid.com/v3/mail/send", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${sendgridApiKey}`
          },
          body: JSON.stringify(retryEmailBody)
        });
        
        console.log(`ADMIN EMAIL ${emailId} - Retry attempt response status: ${retryResponse.status}`);
      }
    }
    
    // Check if the request was successful
    if (!response.ok) {
      const errorText = await response.text();
      console.error("SendGrid API error:", errorText);
      throw new Error(`SendGrid API returned ${response.status}: ${errorText}`);
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
    return { 
      success: false, 
      error: error instanceof Error ? error.message : String(error),
      recipient: to,
      subject: subject
    };
  }
}
