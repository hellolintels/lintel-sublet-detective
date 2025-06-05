
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
    
    console.log(`🚀 Processing ${action} action for contact: ${submissionId}`);
    
    // Get contact details (updated function name for clarity but same functionality)
    let contact;
    try {
      contact = await getSubmission(submissionId);
    } catch (error) {
      console.error("❌ Failed to fetch contact:", error.message);
      return new Response(
        `<html><body><h1>Contact Not Found</h1><p>Could not find contact with ID: ${submissionId}</p><p>Error: ${error.message}</p></body></html>`,
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'text/html' } }
      );
    }
    
    // Check if already processed
    if (contact.status !== 'new' && contact.status !== 'pending') {
      console.log(`⚠️ Contact already processed with status: ${contact.status}`);
      return new Response(
        `<html><body><h1>Already Processed</h1><p>This contact has already been processed (current status: ${contact.status}).</p></body></html>`,
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'text/html' } }
      );
    }
    
    // Handle approval or rejection
    let responseMessage: string;
    
    if (action === 'approve') {
      console.log("✅ Approving contact and starting Railway processing");
      
      // Use existing approved_file_path or create a placeholder
      let approvedFilePath = contact.approved_file_path;
      if (!approvedFilePath) {
        approvedFilePath = `approved/${submissionId}-${contact.file_name || 'addresses.csv'}`;
        console.log("📁 Using approved file path:", approvedFilePath);
      }
      
      // Update contact with approval status
      const contactId = await createContactFromSubmission(submissionId, approvedFilePath);
      console.log("👤 Updated contact with ID:", contactId);
      
      // Update contact status to pending (changed from 'approved' to 'pending')
      await updateSubmissionStatus(submissionId, 'pending');
      console.log("📝 Updated contact status to pending");
      
      responseMessage = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 20px auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
          <h2 style="color: #4CAF50;">✅ Submission Approved Successfully</h2>
          <p><strong>Contact ID:</strong> ${submissionId}</p>
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
      console.log("❌ Rejecting contact");
      
      // Update contact status to rejected
      await updateSubmissionStatus(submissionId, 'rejected');
      
      responseMessage = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 20px auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
          <h2 style="color: #ff6b6b;">❌ Submission Rejected</h2>
          <p><strong>Contact ID:</strong> ${submissionId}</p>
          <p>The uploaded data has been rejected.</p>
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
