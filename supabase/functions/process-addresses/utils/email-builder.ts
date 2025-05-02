
import { EmailAttachment } from "./email-types.ts";

/**
 * Validates and cleans attachment content to ensure valid base64
 */
export function cleanAttachmentContent(attachment: EmailAttachment | undefined): EmailAttachment | undefined {
  if (!attachment || !attachment.content) {
    console.log("No valid attachment or empty content");
    return undefined;
  }
  
  // Ensure we have a valid string content
  if (typeof attachment.content !== 'string') {
    console.error("Attachment content is not a string");
    return undefined;
  }
  
  // Make sure content has actual data
  if (attachment.content.trim().length === 0) {
    console.error("Attachment content is empty after trimming");
    return undefined;
  }
  
  try {
    // If it starts with data:, extract only the base64 part
    if (attachment.content.includes('base64,')) {
      console.log("Removing data URI prefix from attachment content");
      attachment.content = attachment.content.split('base64,')[1];
    }
    
    // Handle hex-encoded bytea format (from Postgres)
    if (attachment.content.startsWith('\\x')) {
      console.log("Converting hex-encoded bytea to base64");
      const hexString = attachment.content.substring(2);
      
      // Convert hex to binary array
      const binaryArray = new Uint8Array(hexString.length / 2);
      for (let i = 0; i < hexString.length; i += 2) {
        binaryArray[i/2] = parseInt(hexString.substring(i, i + 2), 16);
      }
      
      // Convert binary array to base64
      let binaryString = '';
      binaryArray.forEach(byte => {
        binaryString += String.fromCharCode(byte);
      });
      attachment.content = btoa(binaryString);
      console.log("Successfully converted hex bytea to base64");
    }
    
    // Remove any non-base64 characters that might cause issues
    attachment.content = attachment.content.replace(/[^A-Za-z0-9+/=]/g, '');
    console.log(`CLEANED ATTACHMENT CONTENT LENGTH: ${attachment.content.length} characters`);
    
    // Validate base64 content by decoding a small sample
    if (attachment.content.length > 10) {
      const sample = attachment.content.substring(0, 10);
      atob(sample); // Will throw if invalid base64
      console.log("Base64 validation check passed for attachment");
    } else if (attachment.content.length > 0) {
      atob(attachment.content); // For very short content, check the whole string
      console.log("Base64 validation check passed for short attachment");
    } else {
      console.error("Empty attachment content after cleaning");
      return undefined;
    }
    
    return attachment;
  } catch (e) {
    console.error("Invalid base64 detected in attachment:", e);
    return undefined;
  }
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
  if (attachment && attachment.content && attachment.content.length > 0) {
    console.log(`Adding attachment: ${attachment.filename}`);
    console.log(`Attachment content length: ${attachment.content.length}`);
    console.log(`Attachment content sample: ${attachment.content.substring(0, 20)}...`);
    
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
