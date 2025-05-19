
// Import necessary types
import { EmailAttachment, EmailSendResult } from "../utils/email-types.ts";

/**
 * Cleans and prepares attachment content for email sending
 * @param attachment Optional attachment information
 * @returns Cleaned attachment or null
 */
export function cleanAttachmentContent(attachment?: EmailAttachment): EmailAttachment | null {
  if (!attachment || !attachment.content) {
    return null;
  }

  try {
    // If the content is a string, ensure it's valid base64
    if (typeof attachment.content === 'string') {
      // Clean the string by removing non-base64 characters
      const cleanContent = attachment.content.replace(/[^A-Za-z0-9+/=]/g, '');
      return {
        ...attachment,
        content: cleanContent
      };
    }
    return attachment;
  } catch (error) {
    console.error('Error cleaning attachment content:', error);
    return null;
  }
}

/**
 * Log details about an email being sent
 * @param to Recipient email
 * @param subject Email subject
 * @param htmlContentLength Length of HTML content
 * @param attachment Optional attachment
 */
export function logEmailDetails(
  to: string,
  subject: string,
  htmlContentLength: number,
  attachment?: EmailAttachment
): void {
  console.log(`Sending email to: ${to}`);
  console.log(`Subject: ${subject}`);
  console.log(`HTML Content Length: ${htmlContentLength} bytes`);
  if (attachment) {
    console.log(`Attachment: ${attachment.filename} (${attachment.content.length} bytes)`);
  } else {
    console.log('No attachment');
  }
}

/**
 * Log details about a SendGrid response
 * @param to Recipient email
 * @param response SendGrid API response
 */
export function logSendGridResponse(to: string, response: Response): void {
  console.log(`SendGrid response for ${to}: status=${response.status}, ok=${response.ok}`);
}

/**
 * Log details about a failed email sending attempt
 * @param to Recipient email
 * @param subject Email subject
 * @param error The error that occurred
 */
export function logSendingFailure(to: string, subject: string, error: unknown): void {
  console.error(`❌ Failed to send email to ${to} with subject "${subject}":`, error);
}

/**
 * Enhanced email sending function with SendGrid API integration
 * @param to Email address of the recipient
 * @param subject Subject line of the email
 * @param htmlContent HTML content of the email
 * @param plainContent Plain text content of the email
 * @param attachment Optional file attachment (base64 encoded)
 * @returns Object indicating success or failure
 */
export async function sendEmail(
  to: string,
  subject: string,
  htmlContent: string,
  plainContent: string = '',
  attachment?: EmailAttachment
): Promise<EmailSendResult> {
  try {
    logEmailDetails(to, subject, htmlContent.length, attachment);
    
    // Validate recipient email
    if (!to || !to.includes('@')) {
      throw new Error(`Invalid recipient email: ${to}`);
    }
    
    // Clean up the attachment content - CRITICAL FIX HERE
    let cleanedAttachment = null;
    if (attachment && attachment.content) {
      // Ensure attachment content is properly base64 encoded
      if (typeof attachment.content === 'string' && attachment.content.length > 0) {
        // This is critical - many attachment encoding issues come from improper base64
        try {
          // Test if it's already valid base64
          atob(attachment.content);
          cleanedAttachment = attachment;
        } catch (e) {
          // If not valid base64, try to encode it
          console.log("Attachment is not valid base64, attempting to encode...");
          cleanedAttachment = {
            ...attachment,
            content: btoa(attachment.content)
          };
        }
      }
    }
    
    // Get the SendGrid API key from environment variables
    const sendgridApiKey = Deno.env.get("SENDGRID_API_KEY");
    if (!sendgridApiKey) {
      throw new Error("SendGrid API key is not configured");
    }
    
    // Prepare the email payload for SendGrid API
    const emailPayload: any = {
      personalizations: [
        {
          to: [{ email: to }]
        }
      ],
      from: {
        email: 'hello@lintels.in',
        name: 'Lintels.in'
      },
      subject: subject,
      content: [
        {
          type: 'text/plain',
          value: plainContent || htmlContent.replace(/<[^>]*>?/gm, '')
        },
        {
          type: 'text/html',
          value: htmlContent
        }
      ]
    };
    
    // Add attachment if provided and content is valid
    if (cleanedAttachment && cleanedAttachment.content && cleanedAttachment.content.length > 0) {
      console.log(`Adding attachment: ${cleanedAttachment.filename}`);
      console.log(`Attachment content length: ${cleanedAttachment.content.length}`);
      
      emailPayload.attachments = [
        {
          content: cleanedAttachment.content,
          filename: cleanedAttachment.filename,
          type: cleanedAttachment.contentType || 'text/csv',
          disposition: 'attachment'
        }
      ];
    }
    
    // Send the email using SendGrid API
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${sendgridApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailPayload)
    });
    
    logSendGridResponse(to, response);
    
    if (response.ok) {
      return { 
        success: true, 
        messageId: `sendgrid_${Date.now()}`,
        recipient: to,
        subject: subject
      };
    } else {
      const errorText = await response.text();
      throw new Error(`SendGrid API error: ${response.status} - ${errorText}`);
    }
    
  } catch (error) {
    logSendingFailure(to, subject, error);
    
    return { 
      success: false, 
      error: error instanceof Error ? error.message : String(error),
      recipient: to,
      subject: subject
    };
  }
}
