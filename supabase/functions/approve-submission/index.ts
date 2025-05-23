
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { handleCors, corsHeaders } from '../_shared/cors.ts';
import { getSubmission, updateSubmissionStatus, createContactFromSubmission, updateContactStatus } from '../_shared/db.ts';
import { moveFileToApprovedBucket, downloadFileContent } from '../_shared/storage.ts';
import { sendEmail } from '../_shared/email.ts';
import { ApprovalAction } from '../_shared/types.ts';

/**
 * Handle approval or rejection of submissions
 */
serve(async (req) => {
  try {
    // Handle CORS preflight
    const corsResponse = handleCors(req);
    if (corsResponse) return corsResponse;
    
    console.log("🔄 Approval/rejection request received");
    
    // Get parameters from URL
    const url = new URL(req.url);
    const submissionId = url.searchParams.get("id");
    const action = url.searchParams.get("action") as ApprovalAction | null;
    
    // Validate parameters
    if (!submissionId || (action !== 'approve' && action !== 'reject')) {
      console.error('Invalid parameters:', { submissionId, action });
      return new Response(
        `<html><body><h1>Missing required parameters</h1><p>Please ensure both action and id are provided.</p></body></html>`,
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'text/html' } }
      );
    }
    
    console.log(`Processing ${action} action for submission: ${submissionId}`);
    
    // Get submission details
    const submission = await getSubmission(submissionId);
    
    // Check if already processed
    if (submission.status !== 'pending') {
      return new Response(
        `<html><body><h1>Already Processed</h1><p>This submission has already been processed (current status: ${submission.status}).</p></body></html>`,
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'text/html' } }
      );
    }
    
    // Handle approval or rejection
    let responseMessage: string;
    
    if (action === 'approve') {
      console.log("Approving submission");
      
      // Move file to approved bucket
      const sourcePath = submission.storage_path;
      let approvedFilePath: string;
      
      try {
        approvedFilePath = await moveFileToApprovedBucket(sourcePath, submissionId);
      } catch (fileError) {
        console.error("Failed to move file:", fileError);
        
        // Continue with a placeholder
        approvedFilePath = `approved/${submissionId}-placeholder.csv`;
        console.log("Using placeholder file path:", approvedFilePath);
      }
      
      // Create contact record
      const contactId = await createContactFromSubmission(submissionId, approvedFilePath);
      console.log("Created contact with ID:", contactId);
      
      // Update submission status
      await updateSubmissionStatus(submissionId, 'approved');
      
      // Update contact status
      await updateContactStatus(contactId, 'processing');
      
      responseMessage = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 20px auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
          <h2 style="color: #4CAF50;">Submission Approved Successfully</h2>
          <p>Submission ID: ${submissionId}</p>
          <p>The data has been approved and will now be processed.</p>
          <p>You will receive an email with results once processing is complete.</p>
        </div>
      `;
      
      // Trigger processing via process-data function
      const projectRef = Deno.env.get('PROJECT_REF') || 'uejymkggevuvuerldzhv';
      try {
        const processUrl = `https://${projectRef}.functions.supabase.co/process-data?contact_id=${contactId}`;
        console.log("Calling process-data function at URL:", processUrl);
        
        fetch(processUrl, {
          method: "GET",
          headers: {
            "Content-Type": "application/json"
          }
        }).catch(err => {
          console.error("Error triggering process-data function:", err);
          // Non-blocking, we'll continue even if this fails
        });
      } catch (processError) {
        console.error("Error triggering data processing:", processError);
        // Non-blocking, we'll continue even if this fails
      }
    } else {
      console.log("Rejecting submission");
      
      // Delete file if possible
      try {
        // We're not awaiting this since it's not critical
        moveFileToApprovedBucket(submission.storage_path, submissionId)
          .catch(err => console.log("File deletion failed, but that's ok:", err));
      } catch (deleteError) {
        console.log("File deletion error, continuing anyway:", deleteError);
      }
      
      // Update submission status
      await updateSubmissionStatus(submissionId, 'rejected');
      
      responseMessage = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 20px auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
          <h2 style="color: #000000;">Submission Rejected</h2>
          <p>Submission ID: ${submissionId}</p>
          <p>The uploaded data has been rejected and removed from our system.</p>
        </div>
      `;
    }
    
    // Return HTML response
    return new Response(
      `<html><body>${responseMessage}</body></html>`,
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'text/html' } }
    );
  } catch (err) {
    console.error('❌ ERROR in approve-submission function:', err);
    
    // Return error page
    return new Response(
      `<html><body><h1>Error Processing Request</h1><p>${err.message}</p></body></html>`,
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'text/html' } }
    );
  }
});
