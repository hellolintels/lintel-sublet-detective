// supabase/functions/process-approval/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

// --- Environment Variables ---
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// --- Main Function Logic ---
serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    console.log("Handling OPTIONS preflight request for process-approval");
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    console.log(`process-approval function called with method: ${req.method}`);

    if (req.method !== "GET") {
      throw new Error("Method Not Allowed: Only GET requests are accepted for approval/rejection.");
    }

    const url = new URL(req.url);
    const submissionId = url.searchParams.get("id");
    const action = url.searchParams.get("action"); // "approve" or "reject"

    if (!submissionId || !action || (action !== "approve" && action !== "reject")) {
      throw new Error("Missing or invalid parameters: 'id' and 'action' (approve/reject) are required.");
    }

    console.log(`Processing action: ${action} for submission ID: ${submissionId}`);

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // 1. Fetch the pending submission details
    const { data: submission, error: fetchError } = await supabaseAdmin
      .from("pending_submissions")
      .select("*, status, storage_path")
      .eq("id", submissionId)
      .single();

    if (fetchError) {
      console.error("Error fetching submission:", fetchError);
      throw new Error(`Submission not found or error fetching: ${fetchError.message}`);
    }

    if (submission.status !== "pending") {
      return new Response(`Submission ${submissionId} has already been processed (Status: ${submission.status}).`, { status: 409 }); // Conflict
    }

    let responseMessage = "";

    // 2. Perform Approve or Reject action
    if (action === "approve") {
      console.log(`Approving submission ID: ${submissionId}`);

      // a. Copy file from pending to approved bucket
      const sourcePath = submission.storage_path;
      const destinationPath = `approved/${sourcePath.split("/").pop()}`;
      console.log(`Copying file from ${sourcePath} to ${destinationPath}`);
      const { error: copyError } = await supabaseAdmin.storage
        .from("pending-uploads")
        .copy(sourcePath, { destinationBucket: "approved-uploads", destinationPath: destinationPath });

      if (copyError) {
        console.error("Error copying file to approved bucket:", copyError);
        await supabaseAdmin.from("pending_submissions").update({ status: "failed", error_message: `File copy failed: ${copyError.message}` }).eq("id", submissionId);
        throw new Error(`Failed to copy file to approved bucket: ${copyError.message}`);
      }
      console.log("File copied successfully.");

      // b. Insert contact details into the main contacts table
      console.log("Inserting contact details into main table...");
      const { error: insertError } = await supabaseAdmin
        .from("contacts") // Assuming your main table is named 'contacts'
        .insert({
          full_name: submission.full_name,
          email: submission.email,
          company: submission.company,
          position: submission.position,
          phone: submission.phone,
          // Add reference to the approved file if needed
          approved_file_path: destinationPath,
          status: "approved", // Or whatever status indicates completion
          // Add any other relevant fields from submission
        });

      if (insertError) {
        console.error("Error inserting into contacts table:", insertError);
        // Consider how to handle this - maybe update pending status to failed?
        await supabaseAdmin.from("pending_submissions").update({ status: "failed", error_message: `Contact insert failed: ${insertError.message}` }).eq("id", submissionId);
        // Optionally try to delete the copied file?
        throw new Error(`Failed to insert contact details: ${insertError.message}`);
      }
      console.log("Contact details inserted successfully.");

      // c. Delete the original file from pending bucket
      console.log(`Deleting original file: ${sourcePath}`);
      const { error: deleteError } = await supabaseAdmin.storage
        .from("pending-uploads")
        .remove([sourcePath]);

      if (deleteError) {
        // Log error but proceed, as main action succeeded
        console.error("Error deleting original file from pending bucket:", deleteError);
      }
      console.log("Original file deleted.");

      // d. Update pending submission status to approved
      console.log("Updating pending submission status to approved.");
      const { error: updateStatusError } = await supabaseAdmin
        .from("pending_submissions")
        .update({ status: "approved" })
        .eq("id", submissionId);

      if (updateStatusError) {
        // Log error but consider main action successful
        console.error("Error updating pending submission status:", updateStatusError);
      }

      // --- TODO: Trigger Bright Data Matching Process Here --- 
      console.log(`Placeholder: Trigger Bright Data matching for contact/file: ${destinationPath}`);
      // Add your Bright Data API call or trigger logic here
      // --------------------------------------------------------

      responseMessage = `Submission ${submissionId} approved successfully. File moved and contact created. Bright Data matching initiated (placeholder).`;

    } else if (action === "reject") {
      console.log(`Rejecting submission ID: ${submissionId}`);

      // a. Delete the file from pending bucket
      const sourcePath = submission.storage_path;
      console.log(`Deleting file: ${sourcePath}`);
      const { error: deleteError } = await supabaseAdmin.storage
        .from("pending-uploads")
        .remove([sourcePath]);

      if (deleteError) {
        console.error("Error deleting file from pending bucket on rejection:", deleteError);
        // Update status to failed, but still report rejection
        await supabaseAdmin.from("pending_submissions").update({ status: "failed", error_message: `File deletion failed on rejection: ${deleteError.message}` }).eq("id", submissionId);
        // Continue to report rejection
      }
      console.log("File deleted on rejection.");

      // b. Update pending submission status to rejected
      console.log("Updating pending submission status to rejected.");
      const { error: updateStatusError } = await supabaseAdmin
        .from("pending_submissions")
        .update({ status: "rejected" })
        .eq("id", submissionId);

      if (updateStatusError) {
        console.error("Error updating pending submission status to rejected:", updateStatusError);
        // Log error but proceed
      }

      responseMessage = `Submission ${submissionId} rejected successfully. File deleted.`;
    }

    // 3. Return success response (HTML page for user feedback)
    return new Response(
      `<html><body><h1>Action Complete</h1><p>${responseMessage}</p></body></html>`,
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "text/html" }, // Return HTML
      }
    );

  } catch (err) {
    console.error("❌ ERROR in process-approval function:", err);
    // Return an error HTML page
    return new Response(
      `<html><body><h1>Error Processing Request</h1><p>An error occurred: ${err.message}</p></body></html>`,
      {
        status: err.message.includes("Method Not Allowed") ? 405 : (err.message.includes("Submission not found") ? 404 : 500),
        headers: { ...corsHeaders, "Content-Type": "text/html" },
      }
    );
  }
});

