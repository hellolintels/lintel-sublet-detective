
import { EmailAttachment } from "./email-types.ts";

/**
 * Validates and cleans attachment content to ensure valid base64
 */
export function cleanAttachmentContent(attachment: EmailAttachment | undefined): EmailAttachment | undefined {
  if (!attachment) return undefined;
  
  if (attachment.content && attachment.content.length > 0) {
    // Remove any non-base64 characters that might cause issues
    attachment.content = attachment.content.replace(/[^A-Za-z0-9+/=]/g, '');
    console.log(`CLEANED ATTACHMENT CONTENT LENGTH: ${attachment.content.length} characters`);
    
    if (attachment.content.length > 0) {
      return attachment;
    }
  }
  
  console.log(`ATTACHMENT CONTENT IS EMPTY OR INVALID`);
  return undefined; // Don't include invalid attachments
}

/**
 * Prepares the email body for SendGrid API
 */
export function prepareEmailBody(
  to: string, 
  subject: string, 
  htmlContent: string, 
  attachment?: EmailAttachment
): any {
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
  
  return emailBody;
}

/**
 * Prepares the fallback email body for admin retries
 */
export function prepareAdminRetryEmailBody(to: string, subject: string): any {
  return {
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
}
