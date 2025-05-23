
import { corsHeaders } from './cors.ts';

/**
 * Send email using the server's email functionality
 * @param to Recipient email address
 * @param subject Email subject
 * @param htmlContent HTML content of the email
 * @param textContent Optional plain text content
 * @param attachment Optional file attachment
 */
export async function sendEmail(
  to: string,
  subject: string,
  htmlContent: string,
  textContent?: string,
  attachment?: {
    content: string;
    filename: string;
    contentType: string;
  }
): Promise<{success: boolean; message?: string}> {
  try {
    console.log(`Sending email to ${to} with subject: ${subject}`);
    
    // Get API key and sender
    const apiKey = Deno.env.get('SENDGRID_API_KEY');
    const sender = Deno.env.get('SENDER_EMAIL') || 'noreply@lintels.in';
    
    if (!apiKey) {
      console.warn("SendGrid API key not configured, email delivery disabled");
      return { success: false, message: "Email service not configured" };
    }
    
    // Validate email address format
    const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
    if (!emailRegex.test(to)) {
      console.warn(`Invalid recipient email format: ${to}`);
      return { success: false, message: "Invalid recipient email format" };
    }
    
    // Sanitize inputs to prevent header injection
    const sanitizedSubject = sanitizeEmailHeader(subject);
    
    // Prepare email payload with security headers
    const emailPayload: any = {
      personalizations: [
        {
          to: [{ email: to }],
          subject: sanitizedSubject,
        },
      ],
      content: [
        {
          type: "text/html",
          value: htmlContent,
        },
      ],
      from: { email: sender },
      headers: {
        "X-Priority": "1",
        "X-Mailer": "Lintels-SecureMailer",
      }
    };
    
    // Add text content if provided
    if (textContent) {
      emailPayload.content.push({
        type: "text/plain",
        value: textContent,
      });
    }
    
    // Add attachment if provided
    if (attachment) {
      emailPayload.attachments = [
        {
          content: attachment.content,
          filename: attachment.filename,
          type: attachment.contentType,
          disposition: "attachment",
        },
      ];
    }
    
    // Send email via SendGrid with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
    
    try {
      const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(emailPayload),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`SendGrid error ${response.status}: ${errorText}`);
        throw new Error(`Email sending failed: ${response.status} ${response.statusText}`);
      }
      
      console.log(`Email sent successfully to ${to}`);
      return { success: true };
    } catch (fetchError) {
      if (fetchError.name === 'AbortError') {
        console.error("Email sending timed out");
        return { success: false, message: "Email sending timed out" };
      }
      throw fetchError;
    }
  } catch (error) {
    console.error("Email sending error:", error);
    return { success: false, message: error.message || "Unknown error" };
  }
}

/**
 * Sanitize email headers to prevent injection attacks
 */
function sanitizeEmailHeader(input: string): string {
  if (!input) return '';
  
  // Remove any characters that could be used for header injection
  return input
    .replace(/\r/g, '')
    .replace(/\n/g, '')
    .replace(/:/g, ' ')
    .trim();
}

/**
 * Build a notification email for admins
 */
export function buildAdminNotificationEmail(contact: any) {
  // Validate and sanitize inputs
  const safeContact = sanitizeContactData(contact);
  const approveUrl = `https://lintels.in/approve-processing?action=approve&id=${safeContact.id}`;
  const rejectUrl = `https://lintels.in/approve-processing?action=reject&id=${safeContact.id}`;

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #d3d3d3; border-radius: 5px;">
      <h2 style="color: #F97316; text-align: center;">New Address Submission</h2>

      <h3>📄 User Details</h3>
      <ul>
        <li><strong>Full Name:</strong> ${safeContact.full_name}</li>
        <li><strong>Position:</strong> ${safeContact.position || 'Not provided'}</li>
        <li><strong>Company:</strong> ${safeContact.company || 'Not provided'}</li>
        <li><strong>Email:</strong> ${safeContact.email}</li>
        <li><strong>Phone:</strong> ${safeContact.phone || 'Not provided'}</li>
        <li><strong>Form Type:</strong> ${safeContact.form_type || 'sample'}</li>
      </ul>

      <h3>📁 File Information</h3>
      <ul>
        <li><strong>File Name:</strong> ${safeContact.file_name || 'Not provided'}</li>
        <li><strong>File Type:</strong> ${safeContact.file_type || 'text/csv'}</li>
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
export function buildClientConfirmationEmail(contact: any) {
  // Extract first name from full_name and sanitize
  const safeContact = sanitizeContactData(contact);
  const firstName = safeContact.full_name ? safeContact.full_name.split(' ')[0] : 'there';
  
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #000000; border-radius: 5px;">
      <h1 style="color: #000000; text-align: center;">Thank You for Your Submission</h1>
      <p>Hello ${firstName},</p>
      <p>We've received your address list and will begin processing it shortly. You'll receive your sample report within 48 hours for beta.</p>
      <p>If you have any questions, contact us at <a href="mailto:hello@lintels.in">hello@lintels.in</a>.</p>
      <p style="text-align: center; font-size: 12px; color: #666; margin-top: 20px;">
        This is an automated message from lintels.in
      </p>
    </div>
  `;
}

/**
 * Build too many addresses email
 */
export function buildTooManyAddressesEmail(contact: any, maxRows: number) {
  const safeContact = sanitizeContactData(contact);
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ff6b6b; border-radius: 5px;">
      <h1 style="color: #ff6b6b; text-align: center;">Address List Limit Exceeded</h1>
      <p>Hello ${safeContact.full_name},</p>
      <p>Your file contains more than ${maxRows} addresses.</p>
      <p>For a sample report, please resubmit with fewer addresses.</p>
      <p>For full service, contact us at <a href="mailto:info@lintels.in">info@lintels.in</a>.</p>
      <p style="text-align: center; font-size: 12px; color: #666; margin-top: 20px;">
        This is an automated message from lintels.in
      </p>
    </div>
  `;
}

/**
 * Build admin report email
 */
export function buildAdminReportEmail(contact: any, postcodes: number, matches: number, viewReportUrl: string) {
  const safeContact = sanitizeContactData(contact);
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #4CAF50; border-radius: 5px;">
      <h1 style="color: #4CAF50; text-align: center;">Address Matching Report</h1>
      
      <p style="font-size: 16px;">The address matching process for <strong>${safeContact.full_name}</strong> from <strong>${safeContact.company}</strong> (${safeContact.email}) is now complete.</p>
      
      <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 15px 0;">
        <h3 style="margin-top: 0;">Client Details:</h3>
        <p><strong>Company:</strong> ${safeContact.company}</p>
        <p><strong>Position:</strong> ${safeContact.position}</p>
        <p><strong>Full Name:</strong> ${safeContact.full_name}</p>
        <p><strong>Email:</strong> ${safeContact.email}</p>
        <p><strong>Phone:</strong> ${safeContact.phone}</p>
        
        <h3>Report Summary:</h3>
        <p><strong>Total Postcodes Processed:</strong> ${postcodes}</p>
        <p><strong>Postcodes Requiring Investigation:</strong> ${matches}</p>
      </div>
      
      <p>The complete report is attached to this email in Excel format (XLS). This report includes hyperlinks to the property listings that require investigation.</p>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${viewReportUrl}" 
           style="background-color: #4CAF50; color: white; padding: 15px 25px; text-decoration: none; font-weight: bold; font-size: 18px; border-radius: 5px; display: inline-block;">
          Mark as Reviewed
        </a>
      </div>
      
      <p style="color: #666; font-size: 12px; text-align: center; margin-top: 30px;">
        This is an automated message from lintels.in
      </p>
    </div>
  `;
}

/**
 * Sanitize contact data to prevent XSS attacks
 */
function sanitizeContactData(contact: any): any {
  if (!contact) return {};
  
  const sanitizedContact: any = {};
  const allowedFields = ['id', 'full_name', 'email', 'company', 'position', 'phone', 'form_type', 'file_name', 'file_type'];
  
  for (const field of allowedFields) {
    if (contact[field] !== undefined) {
      if (typeof contact[field] === 'string') {
        sanitizedContact[field] = sanitizeHtmlContent(contact[field]);
      } else {
        sanitizedContact[field] = contact[field];
      }
    }
  }
  
  return sanitizedContact;
}

/**
 * Sanitize HTML content to prevent XSS attacks
 */
function sanitizeHtmlContent(input: string): string {
  if (!input) return '';
  
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/`/g, '&#96;');
}
