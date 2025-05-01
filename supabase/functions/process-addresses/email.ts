
// Email handling module

/**
 * Enhanced email sending function with improved logging
 * @param to Email address of the recipient
 * @param subject Subject line of the email
 * @param htmlContent HTML content of the email
 * @returns Object indicating success or failure
 */
export async function sendEmail(to: string, subject: string, htmlContent: string) {
  try {
    console.log(`===== SENDING EMAIL =====`);
    console.log(`TO: ${to}`);
    console.log(`SUBJECT: ${subject}`);
    console.log(`CONTENT LENGTH: ${htmlContent.length} characters`);
    console.log(`CONTENT PREVIEW: ${htmlContent.substring(0, 100)}...`);
    
    // For MVP, we're using a simple logging approach - would be replaced with a real email service
    // In a production environment, this would call an email API like SendGrid, Mailgun, or AWS SES
    
    // For testing purposes, we'll simulate success
    // In a real implementation, this would return the actual API response
    
    if (to === "jamie@lintels.in") {
      console.log(`PRIORITY EMAIL TO ADMIN: ${to}`);
      console.log(`FULL CONTENT: ${htmlContent}`);
      
      // Add specific debug info for admin emails
      const emailId = `email_${Date.now()}`;
      console.log(`EMAIL ID: ${emailId} - Delivery marked as high priority`);
    }
    
    // In production, return actual delivery status from email API
    return { success: true, messageId: `msg_${Date.now()}` };
  } catch (error) {
    console.error("===== EMAIL SENDING FAILED =====");
    console.error(`Failed to send email to: ${to}`);
    console.error("Error details:", error);
    return { success: false, error };
  }
}
