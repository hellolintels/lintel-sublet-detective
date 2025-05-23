
/**
 * Shared email building utilities for edge functions
 * This file consolidates email building functions that were previously scattered
 */

import { EmailAttachment } from "../process-addresses/utils/email-types.ts";

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
      <h2 style="color: #F97316;">${subject}</h2>
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
      <h2 style="color: #F97316;">Email Delivery Retry</h2>
      <p>This is a retry of a previously failed email.</p>
      <p><strong>Original subject:</strong> ${originalSubject}</p>
      <p>Please check the system logs for more details about the original error.</p>
    </div>
  `;
}

/**
 * Build notification email for administrators
 */
export function buildAdminNotificationEmail(contact: any): string {
  const approveUrl = `https://lintels.in/approve-processing?action=approve&id=${contact.id}`;
  const rejectUrl = `https://lintels.in/approve-processing?action=reject&id=${contact.id}`;

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #d3d3d3; border-radius: 5px;">
      <h2 style="color: #F97316; text-align: center;">New Address Submission</h2>

      <h3>📄 User Details</h3>
      <ul>
        <li><strong>Full Name:</strong> ${contact.full_name}</li>
        <li><strong>Position:</strong> ${contact.position || 'Not provided'}</li>
        <li><strong>Company:</strong> ${contact.company || 'Not provided'}</li>
        <li><strong>Email:</strong> ${contact.email}</li>
        <li><strong>Phone:</strong> ${contact.phone || 'Not provided'}</li>
        <li><strong>Form Type:</strong> ${contact.form_type || 'sample'}</li>
      </ul>

      <h3>📁 File Information</h3>
      <ul>
        <li><strong>File Name:</strong> ${contact.file_name || 'Not provided'}</li>
        <li><strong>File Type:</strong> ${contact.file_type || 'text/csv'}</li>
      </ul>

      <div style="margin: 20px 0;">
        <strong>✅ Suggested Actions</strong>
        <p>Please review the attached CSV file and approve or reject this submission:</p>
        <a href="${approveUrl}" style="display: inline-block; background-color: #F97316; color: white; padding: 10px 20px; margin-right: 10px; text-decoration: none; border-radius: 4px;">✅ Approve</a>
        <a href="${rejectUrl}" style="display: inline-block; background-color: #000000; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">❌ Reject</a>
      </div>

      <p style="font-size: 12px; color: #666;">This is an automated message from Lintels.in</p>
    </div>
  `;
}

/**
 * Build client confirmation email
 */
export function buildClientConfirmationEmail(contact: any): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #2196F3; border-radius: 5px;">
      <h1 style="color: #2196F3; text-align: center;">Thank You for Your Submission</h1>
      <p>Hello ${contact.full_name},</p>
      <p>We've received your address list and will begin processing it shortly. You'll receive your sample report within 24 hours.</p>
      <p>If you have any questions, contact us at <a href="mailto:info@lintels.in">info@lintels.in</a>.</p>
      <p style="text-align: center; font-size: 12px; color: #666; margin-top: 20px;">
        This is an automated message from lintels.in
      </p>
    </div>
  `;
}
