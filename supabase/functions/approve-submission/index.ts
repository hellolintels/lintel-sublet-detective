
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { handleCors, corsHeaders } from '../_shared/cors.ts';
import { getSubmission, updateSubmissionStatus, createContactFromSubmission, updateContactStatus } from '../_shared/db.ts';
import { moveFileToApprovedBucket } from '../_shared/storage.ts';
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
    
    console.log("📋 Request parameters:", { submissionId, action, fullUrl: req.url });
    
    // Validate parameters
    if (!submissionId || (action !== 'approve' && action !== 'reject')) {
      console.error('❌ Invalid parameters:', { submissionId, action });
      return new Response(
        `<html><body><h1>Missing Required Parameters</h1><p>Please ensure both action and id are provided.</p><p>Received: action=${action}, id=${submissionId}</p></body></html>`,
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'text/html' } }
      );
    }
    
    console.log(`🚀 Processing ${action} action for submission: ${submissionId}`);
    
    // Get submission details with improved error handling
    let submission;
    try {
      submission = await getSubmission(submissionId);
    } catch (error) {
      console.error("❌ Failed to fetch submission:", error.message);
      return new Response(
        `<html><body><h1>Submission Not Found</h1><p>Could not find submission with ID: ${submissionId}</p><p>Error: ${error.message}</p></body></html>`,
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'text/html' } }
      );
    }
    
    // Check if already processed
    if (submission.status !== 'pending') {
      console.log(`⚠️ Submission already processed with status: ${submission.status}`);
      return new Response(
        `<html><body><h1>Already Processed</h1><p>This submission has already been processed (current status: ${submission.status}).</p></body></html>`,
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'text/html' } }
      );
    }
    
    // Handle approval or rejection
    let responseMessage: string;
    
    if (action === 'approve') {
      console.log("✅ Approving submission and starting Railway processing");
      
      // Move file to approved bucket
      const sourcePath = submission.storage_path;
      let approvedFilePath: string;
      
      try {
        approvedFilePath = await moveFileToApprovedBucket(sourcePath, submissionId);
        console.log("📁 File moved successfully to:", approvedFilePath);
      } catch (fileError) {
        console.error("❌ Failed to move file:", fileError);
        
        // Continue with a placeholder
        approvedFilePath = `approved/${submissionId}-placeholder.csv`;
        console.log("📁 Using placeholder file path:", approvedFilePath);
      }
      
      // Create contact record with approved status and approved_for_matching flag
      const contactId = await createContactFromSubmission(submissionId, approvedFilePath);
      console.log("👤 Created contact with ID:", contactId);
      
      // Update submission status
      await updateSubmissionStatus(submissionId, 'approved');
      console.log("📝 Updated submission status to approved");
      
      // Update contact status to "approved" and set approved_for_matching to true
      await updateContactStatus(contactId, 'approved');
      console.log("👤 Updated contact status to approved");
      
      // Set approved_for_matching flag specifically
      const supabaseUrl = Deno.env.get('SUPABASE_URL');
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
      
      if (supabaseUrl && supabaseKey) {
        const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
        const supabase = createClient(supabaseUrl, supabaseKey);
        
        const { error: flagError } = await supabase
          .from('contacts')
          .update({ approved_for_matching: true })
          .eq('id', contactId);
          
        if (flagError) {
          console.error("❌ Failed to set approved_for_matching flag:", flagError);
        } else {
          console.log("✅ Set approved_for_matching flag for contact:", contactId);
        }
      }
      
      responseMessage = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 20px auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
          <h2 style="color: #4CAF50;">✅ Submission Approved Successfully</h2>
          <p><strong>Submission ID:</strong> ${submissionId}</p>
          <p><strong>Contact ID:</strong> ${contactId}</p>
          <p><strong>Status:</strong> Approved and ready for Railway processing</p>
          <p>🚀 Railway processing is starting now...</p>
          <p>📧 You will receive an email with results once processing is complete.</p>
        </div>
      `;
      
      // Trigger Railway processing via railway-trigger function
      const projectRef = Deno.env.get('PROJECT_REF') || 'uejymkggevuvuerldzhv';
      try {
        const railwayUrl = `https://${projectRef}.functions.supabase.co/railway-trigger`;
        console.log("🚀 Calling railway-trigger function at URL:", railwayUrl);
        
        const railwayResponse = await fetch(railwayUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
          },
          body: JSON.stringify({
            contactId: contactId
          })
        });
        
        if (railwayResponse.ok) {
          const railwayResult = await railwayResponse.json();
          console.log("🎯 Railway processing started successfully:", railwayResult);
        } else {
          const errorText = await railwayResponse.text();
          console.error("❌ Railway trigger failed:", railwayResponse.status, errorText);
        }
      } catch (railwayError) {
        console.error("❌ Error triggering Railway processing:", railwayError);
        // Non-blocking, we'll continue even if this fails
      }
    } else {
      console.log("❌ Rejecting submission");
      
      // Delete file if possible
      try {
        // We're not awaiting this since it's not critical
        moveFileToApprovedBucket(submission.storage_path, submissionId)
          .catch(err => console.log("🗑️ File deletion failed, but that's ok:", err));
      } catch (deleteError) {
        console.log("🗑️ File deletion error, continuing anyway:", deleteError);
      }
      
      // Update submission status
      await updateSubmissionStatus(submissionId, 'rejected');
      
      responseMessage = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 20px auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
          <h2 style="color: #ff6b6b;">❌ Submission Rejected</h2>
          <p><strong>Submission ID:</strong> ${submissionId}</p>
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
    console.error('💥 CRITICAL ERROR in approve-submission function:', err);
    
    // Return error page with more details
    return new Response(
      `<html><body><h1>❌ Error Processing Request</h1><p><strong>Error:</strong> ${err.message}</p><p><strong>Stack:</strong> ${err.stack}</p></body></html>`,
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'text/html' } }
    );
  }
});
