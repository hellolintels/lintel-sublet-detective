
/**
 * Logs email sending details
 */
export function logEmailDetails(to: string, subject: string, htmlContentLength: number, attachment?: any): void {
  console.log(`===== SENDING EMAIL =====`);
  console.log(`TO: ${to}`);
  console.log(`SUBJECT: ${subject}`);
  console.log(`CONTENT LENGTH: ${htmlContentLength} characters`);
  
  if (attachment) {
    console.log(`ATTACHMENT: ${attachment.filename} (${attachment.type})`);
    console.log(`ATTACHMENT CONTENT LENGTH: ${attachment.content ? attachment.content.length : 0} characters`);
    
    if (attachment.content && attachment.content.length > 0) {
      console.log(`ATTACHMENT CONTENT PREVIEW: ${attachment.content.substring(0, 20)}...`);
    } else {
      console.log(`ATTACHMENT CONTENT IS EMPTY OR INVALID`);
    }
  }
  
  // Enhanced logging for admin emails
  if (to === "jamie@lintels.in") {
    console.log(`CRITICAL ADMIN EMAIL TO: ${to}`);
    console.log(`Email sending attempt started at: ${new Date().toISOString()}`);
  }
}

/**
 * Logs SendGrid API response
 */
export function logSendGridResponse(to: string, response: Response): void {
  console.log(`SendGrid API Response Status: ${response.status}`);
  
  // Special handling for admin emails to ensure delivery
  if (to === "jamie@lintels.in") {
    const emailId = `admin_email_${Date.now()}`;
    console.log(`ADMIN EMAIL TRACKING ID: ${emailId}`);
    console.log(`ADMIN EMAIL ${emailId} - SendGrid Response Status: ${response.status}`);
    console.log(`ADMIN EMAIL ${emailId} - Sent at: ${new Date().toISOString()}`);
  }
}

/**
 * Logs email sending failure
 */
export function logSendingFailure(to: string, subject: string, error: unknown): void {
  console.error("===== EMAIL SENDING FAILED =====");
  console.error(`Failed to send email to: ${to}`);
  console.error(`Subject: ${subject}`);
  console.error("Error details:", error);
}
