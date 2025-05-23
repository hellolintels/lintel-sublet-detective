
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { handleCors, corsHeaders } from '../_shared/cors.ts';
import { ensureStorageSetup } from '../_shared/storage.ts';
import { SubmissionPayload, ProcessingResult } from '../_shared/types.ts';
import { recordSubmission, updateSubmissionStatus } from '../_shared/db.ts';
import { sendEmail, buildAdminNotificationEmail, buildClientConfirmationEmail } from '../_shared/email.ts';
import { processFileForEmailAttachment } from '../_shared/file-processing.ts';

/**
 * Handle form submission
 */
serve(async (req) => {
  try {
    // Handle CORS preflight
    const corsResponse = handleCors(req);
    if (corsResponse) return corsResponse;
    
    console.log("📥 Form submission request received");
    
    // Parse request data
    const requestData = await req.text();
    let payload: SubmissionPayload;
    
    try {
      payload = JSON.parse(requestData);
      console.log("Submission payload received for:", payload.full_name);
    } catch (jsonError) {
      console.error('Failed to parse JSON payload:', jsonError);
      console.log('Raw payload received:', requestData);
      return new Response(
        JSON.stringify({ error: 'Invalid JSON payload' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Validate required fields
    if (!payload.full_name || !payload.email || !payload.storagePath) {
      console.error('Missing required fields in request payload');
      return new Response(
        JSON.stringify({ error: 'Missing required fields: full_name, email, and storagePath are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Ensure storage is set up
    const storageReady = await ensureStorageSetup();
    if (!storageReady) {
      console.error('Storage system is not available');
      return new Response(
        JSON.stringify({ error: 'Storage system is not available' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Record submission in database
    const submissionId = await recordSubmission(
      {
        full_name: payload.full_name,
        email: payload.email,
        company: payload.company || '',
        position: payload.position,
        phone: payload.phone,
        form_type: payload.form_type || 'sample',
      },
      {
        storagePath: payload.storagePath,
        file_name: payload.file_name,
        file_type: payload.file_type,
      }
    );
    
    // Create a contact object for the email
    const contact = {
      id: submissionId,
      full_name: payload.full_name,
      position: payload.position || '',
      company: payload.company || '',
      email: payload.email,
      phone: payload.phone || '',
      form_type: payload.form_type || 'sample',
      file_name: payload.file_name || payload.storagePath.split('/').pop() || 'file.csv',
      file_type: payload.file_type || 'text/csv'
    };
    
    // Send notification email to admin
    const adminEmail = Deno.env.get('APPROVER_EMAIL') || 'jamie@lintels.in';
    const htmlContent = buildAdminNotificationEmail(contact);
    const plainText = `New submission from ${payload.full_name} (${payload.email})`;
    
    // We don't have the file data, so we send without attachment
    const emailResult = await sendEmail(
      adminEmail,
      `New Address Submission from ${payload.full_name}`,
      htmlContent,
      plainText
    );
    
    console.log('Admin notification email result:', emailResult);
    
    // Send confirmation to client
    const clientEmailResult = await sendEmail(
      payload.email,
      "We've Received Your Address List - Lintels.in",
      buildClientConfirmationEmail(contact)
    );
    
    console.log('Client confirmation email result:', clientEmailResult);
    
    // Update submission status
    await updateSubmissionStatus(submissionId, 'pending');
    
    // Return success response
    const response: ProcessingResult = {
      success: true,
      submissionId,
      emailSent: emailResult.success,
      message: 'Submission received and admin notified',
      status: 'pending'
    };
    
    return new Response(
      JSON.stringify(response),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('❌ ERROR in submit-form function:', err);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: err.message || 'Internal server error',
        timestamp: new Date().toISOString()
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
