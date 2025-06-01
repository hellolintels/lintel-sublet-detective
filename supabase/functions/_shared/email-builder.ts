/**
 * Shared email building utilities for edge functions
 * This file consolidates email building functions that were previously scattered
 */

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

export function buildClientConfirmationEmail(contactData: any): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Thank you for your submission - Lintels.in</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #F97316; color: white; padding: 20px; text-align: center; }
        .content { background-color: #f9f9f9; padding: 20px; }
        .button { 
          display: inline-block; 
          background-color: #F97316; 
          color: white; 
          padding: 12px 24px; 
          text-decoration: none; 
          border-radius: 5px; 
          margin: 10px 0;
        }
        .footer { background-color: #333; color: white; padding: 15px; text-align: center; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Thank You for Your Submission!</h1>
        </div>
        
        <div class="content">
          <p>Hello ${contactData.full_name},</p>
          
          <p>Thank you for submitting your address list to Lintels.in. We have received your file and our team will review it shortly.</p>
          
          <p><strong>Submission Details:</strong></p>
          <ul>
            <li>Name: ${contactData.full_name}</li>
            <li>Company: ${contactData.company || 'Not provided'}</li>
            <li>Email: ${contactData.email}</li>
            <li>File: ${contactData.file_name || 'Address list'}</li>
          </ul>
          
          <p>Our automated system will process eligible files immediately. For files requiring manual review, we'll notify you once approved and processing begins.</p>
          
          <p><strong>What happens next:</strong></p>
          <ol>
            <li>File validation and approval (if needed)</li>
            <li>Automated property matching across multiple platforms</li>
            <li>Report generation and delivery (within 24 hours)</li>
          </ol>
          
          <p>You can track the status of your submission using the link below:</p>
          <p style="text-align: center;">
            <a href="${Deno.env.get('SUPABASE_URL')?.replace('supabase.co', 'lovable.app') || 'https://localhost:5173'}/status?email=${encodeURIComponent(contactData.email)}" class="button">
              Track Processing Status
            </a>
          </p>
          
          <p>If you have any questions, please don't hesitate to contact us.</p>
          
          <p>Best regards,<br>
          The Lintels Team</p>
        </div>
        
        <div class="footer">
          <p>© 2024 Lintels.in - Property Matching Solutions</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

export function buildAdminNotificationEmail(submissionData: any): string {
  const approveUrl = `${Deno.env.get('SUPABASE_URL')?.replace('supabase.co', 'lovable.app') || 'https://localhost:5173'}/approve/${submissionData.id}`;
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>New Submission - Lintels.in</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #F97316; color: white; padding: 20px; text-align: center; }
        .content { background-color: #f9f9f9; padding: 20px; }
        .button { 
          display: inline-block; 
          background-color: #F97316; 
          color: white; 
          padding: 12px 24px; 
          text-decoration: none; 
          border-radius: 5px; 
          margin: 10px 5px;
        }
        .footer { background-color: #333; color: white; padding: 15px; text-align: center; font-size: 12px; }
        .highlight { background-color: #fff3cd; padding: 10px; border-left: 4px solid #ffc107; margin: 10px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>New Submission Received</h1>
        </div>
        
        <div class="content">
          <div class="highlight">
            <strong>Action Required:</strong> A new address list submission requires review and approval.
          </div>
          
          <p><strong>Submission Details:</strong></p>
          <ul>
            <li>Name: ${submissionData.full_name}</li>
            <li>Email: ${submissionData.email}</li>
            <li>Company: ${submissionData.company || 'Not provided'}</li>
            <li>Position: ${submissionData.position || 'Not provided'}</li>
            <li>Phone: ${submissionData.phone || 'Not provided'}</li>
            <li>File: ${submissionData.file_name || 'Address list'}</li>
            <li>File Type: ${submissionData.file_type || 'Unknown'}</li>
            <li>Submission ID: ${submissionData.id}</li>
          </ul>
          
          <p><strong>Note:</strong> Small files (≤120 addresses) may be auto-processed. Larger files or those requiring manual review will need your approval.</p>
          
          <p style="text-align: center;">
            <a href="${approveUrl}" class="button">Review & Approve Submission</a>
          </p>
          
          <p>Once approved, the automated processing system will:</p>
          <ol>
            <li>Extract postcodes from the uploaded file</li>
            <li>Search across Airbnb, SpareRoom, and Gumtree</li>
            <li>Generate and send a comprehensive report to the client</li>
            <li>Notify you when processing is complete</li>
          </ol>
        </div>
        
        <div class="footer">
          <p>© 2024 Lintels.in - Admin Notification System</p>
        </div>
      </div>
    </body>
    </html>
  `;
}
