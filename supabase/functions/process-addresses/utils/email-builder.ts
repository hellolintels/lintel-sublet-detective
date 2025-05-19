
import { EmailAttachment } from "./email-types.ts";

/**
 * Clean and prepare attachment content for email sending
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
 * Prepare email body for standard notifications
 */
export function prepareEmailBody(templateHtml: string, subject: string): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #4CAF50;">${subject}</h2>
      ${templateHtml}
      <p style="font-size: 12px; color: #666; margin-top: 30px; text-align: center;">
        This is an automated message from Lintels.in
      </p>
    </div>
  `;
}

/**
 * Prepare a simplified retry email body for admin
 */
export function prepareAdminRetryEmailBody(originalSubject: string): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #f44336;">Email Delivery Retry</h2>
      <p>This is a retry of a previously failed email.</p>
      <p><strong>Original subject:</strong> ${originalSubject}</p>
      <p>Please check the system logs for more details about the original error.</p>
    </div>
  `;
}
