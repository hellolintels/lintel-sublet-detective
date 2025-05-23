
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { handleCors, corsHeaders } from '../_shared/cors.ts';
import { createSubmission, createContactFromSubmission } from '../_shared/db.ts';
import { downloadFileContent } from '../_shared/storage.ts';
import { sendEmail } from '../_shared/email.ts';
import { createLogger } from '../_shared/debug-logger.ts';
import { buildAdminNotificationEmail, buildClientConfirmationEmail } from '../_shared/email-builder.ts';

const logger = createLogger({ module: 'submit-form' });

// Process form submission and notify administrators
serve(async (req) => {
  try {
    // Handle CORS preflight
    const corsResponse = handleCors(req);
    if (corsResponse) return corsResponse;
    
    logger.info("📝 Form submission request received");
    
    // Parse request data
    const requestData = await req.json();
    
    logger.debug("Form data received", {
      name: requestData.full_name,
      email: requestData.email,
      company: requestData.company,
      formType: requestData.form_type
    });
    
    // Validate submission
    if (!requestData.full_name || !requestData.email || !requestData.storagePath) {
      logger.warn("Submission validation failed", { requestData });
      return new Response(
        JSON.stringify({
          success: false,
          error: "Missing required fields"
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Store submission in database
    const submissionId = await createSubmission(requestData);
    logger.info(`Created submission with ID ${submissionId}`);
    
    // Try to download the file to verify it exists
    try {
      await downloadFileContent(requestData.storagePath);
      logger.info("Verified file exists");
    } catch (fileError) {
      logger.warn("File verification error", { error: fileError });
      // Continue even if file access fails - admin review will catch issues
    }
    
    // Get admin and sender emails from env
    const adminEmail = Deno.env.get("APPROVER_EMAIL") || "jamie@lintels.in";
    
    // Prepare admin notification email
    const adminHtml = buildAdminNotificationEmail(requestData);
    
    // Send admin notification
    const adminEmailResult = await sendEmail(
      adminEmail,
      `New Request: ${requestData.full_name} from ${requestData.company}`,
      adminHtml
    );
    
    // Prepare client confirmation email (simplified)
    const clientHtml = buildClientConfirmationEmail(requestData);
    
    // Send client confirmation
    const clientEmailResult = await sendEmail(
      requestData.email,
      "Thank you for your submission to Lintels.in",
      clientHtml
    );
    
    logger.info("Email notification sent to admin", { success: adminEmailResult.success });
    logger.info("Confirmation email sent to client", { success: clientEmailResult.success });
    
    // Return success with result details
    return new Response(
      JSON.stringify({
        success: true,
        submissionId,
        emailSent: adminEmailResult.success && clientEmailResult.success
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    logger.error("❌ ERROR in submit-form function", { error: error.message });
    
    // Return error response
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "An unknown error occurred"
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
