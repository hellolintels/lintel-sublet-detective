
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const projectRef = Deno.env.get("PROJECT_REF");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const submissionId = url.searchParams.get("id");
    const action = url.searchParams.get("action");

    console.log(`Process approval function called with: action=${action}, id=${submissionId}`);

    if (!submissionId || (action !== "approve" && action !== "reject")) {
      return new Response(`<html><body><h1>Missing required parameters.</h1><p>Please ensure both action and id are provided.</p></body></html>`, {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "text/html" }
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
    const { data: submission, error: fetchError } = await supabaseAdmin
      .from("pending_submissions")
      .select("*")
      .eq("id", submissionId)
      .single();

    if (fetchError || !submission) {
      console.error("Error fetching submission:", fetchError);
      return new Response(`<html><body><h1>Error Processing Request</h1><p>Submission not found or error fetching: ${fetchError?.message || "Unknown error"}</p></body></html>`, {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "text/html" }
      });
    }

    console.log(`Found submission: ${submission.id}, current status: ${submission.status}`);

    if (submission.status !== "pending") {
      return new Response(`<html><body><h1>Already Processed</h1><p>This submission has already been processed (current status: ${submission.status}).</p></body></html>`, {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "text/html" }
      });
    }

    let responseMessage = "";

    if (action === "approve") {
      const sourcePath = submission.storage_path;
      const filename = sourcePath?.split("/").pop();
      const destinationPath = `approved/${filename}`;

      console.log(`Approving submission. Copying file from ${sourcePath} to ${destinationPath}`);

      const { error: copyError } = await supabaseAdmin
        .storage
        .from("pending-uploads")
        .copy(sourcePath, destinationPath);

      if (copyError) {
        console.error("Error copying file:", copyError);
        await supabaseAdmin.from("pending_submissions").update({
          status: "failed",
          error_message: `File copy failed: ${copyError.message}`
        }).eq("id", submissionId);

        throw new Error(`Failed to copy file to approved bucket: ${copyError.message}`);
      }

      console.log("File copied successfully. Creating contact record.");

      const { data: contact, error: contactError } = await supabaseAdmin
        .from("contacts")
        .insert({
          full_name: submission.full_name,
          email: submission.email,
          company: submission.company,
          position: submission.position,
          phone: submission.phone,
          approved_file_path: destinationPath,
          status: "approved",
          form_type: "sample"
        })
        .select("id")
        .single();

      if (contactError) {
        console.error("Error creating contact:", contactError);
        throw new Error(`Failed to create contact record: ${contactError.message}`);
      }

      console.log(`Contact created with ID: ${contact.id}`);
      
      // Clean up the original file from pending-uploads
      await supabaseAdmin.storage.from("pending-uploads").remove([sourcePath]);

      await supabaseAdmin.from("pending_submissions").update({
        status: "approved"
      }).eq("id", submissionId);

      responseMessage = `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 20px auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <h2 style="color: #4CAF50;">Submission Approved Successfully</h2>
        <p>Submission ID: ${submissionId}</p>
        <p>The data has been approved and is now being processed by our system.</p>
        <p>You will receive an email with the results once processing is complete.</p>
      </div>`;

      // Trigger Bright Data processing by calling the process-addresses function
      console.log(`Triggering address processing for contact ID: ${contact.id}`);
      try {
        const processUrl = `https://${projectRef}.supabase.co/functions/v1/process-addresses?action=initial_process&contact_id=${contact.id}`;
        const processResponse = await fetch(processUrl, { 
          method: "GET",
          headers: {
            "Authorization": `Bearer ${serviceRoleKey}`
          }
        });
        
        console.log(`Process-addresses function response status: ${processResponse.status}`);
        if (!processResponse.ok) {
          const errorText = await processResponse.text();
          console.error("Error response from process-addresses:", errorText);
        } else {
          console.log("Address processing triggered successfully");
        }
      } catch (processError) {
        console.error("Error triggering address processing:", processError);
        // We don't throw here as the approval process itself was successful
      }
    }

    if (action === "reject") {
      console.log("Rejecting submission. Removing file and updating status.");
      const sourcePath = submission.storage_path;
      await supabaseAdmin.storage.from("pending-uploads").remove([sourcePath]);
      await supabaseAdmin.from("pending_submissions").update({
        status: "rejected"
      }).eq("id", submissionId);

      responseMessage = `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 20px auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <h2 style="color: #F44336;">Submission Rejected</h2>
        <p>Submission ID: ${submissionId}</p>
        <p>The uploaded data has been rejected and removed from our system.</p>
      </div>`;
    }

    return new Response(`<html><body>${responseMessage}</body></html>`, {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "text/html" }
    });

  } catch (err) {
    console.error("❌ ERROR in process-approval function:", err);
    return new Response(`<html><body><h1>Error Processing Request</h1><p>${err.message}</p></body></html>`, {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "text/html" }
    });
  }
});
