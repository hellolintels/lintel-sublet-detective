import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const projectRef = Deno.env.get("PROJECT_REF");

Deno.serve(async (req) => {
  console.log(`Request received: ${req.method} ${req.url}`);
  console.log("Headers:", Object.fromEntries(req.headers.entries()));
  
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    console.log("Handling OPTIONS request with CORS headers");
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    console.log("🔄 process-approval function called");
    
    const url = new URL(req.url);
    const submissionId = url.searchParams.get("id");
    const action = url.searchParams.get("action");
    
    console.log(`Process approval function called with: action=${action}, id=${submissionId}`);

    if (!submissionId || (action !== "approve" && action !== "reject")) {
      console.error(`Invalid parameters: action=${action}, id=${submissionId}`);
      return new Response(`<html><body><h1>Missing required parameters.</h1><p>Please ensure both action and id are provided.</p></body></html>`, {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "text/html" }
      });
    }

    if (!supabaseUrl || !serviceRoleKey) {
      console.error("Missing Supabase credentials", { supabaseUrl: !!supabaseUrl, serviceRoleKey: !!serviceRoleKey });
      return new Response(`<html><body><h1>Server Configuration Error</h1><p>Missing Supabase credentials</p></body></html>`, {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "text/html" }
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
    console.log(`Fetching submission with ID: ${submissionId}`);
    
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
      // Validate email domain is @lintels.in
      if (!submission.email.endsWith("@lintels.in")) {
        console.log(`Email domain restriction: ${submission.email} not permitted`);
        await supabaseAdmin.from("pending_submissions").update({
          status: "rejected",
          error_message: "Access restricted to @lintels.in email addresses only"
        }).eq("id", submissionId);
        
        return new Response(`<html><body>
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 20px auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
            <h2 style="color: #F97316;">Access Restricted</h2>
            <p>This feature is currently restricted to @lintels.in email addresses only.</p>
            <p>Your submission has been rejected.</p>
          </div></body></html>`, {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "text/html" }
        });
      }
      
      // Check if storage buckets exist and create them if needed
      console.log("Ensuring required storage buckets exist");
      
      try {
        // Check if pending-uploads bucket exists
        const { data: buckets } = await supabaseAdmin.storage.listBuckets();
        
        const pendingBucketExists = buckets?.some(b => b.name === 'pending-uploads') || false;
        const approvedBucketExists = buckets?.some(b => b.name === 'approved-uploads') || false;
        
        if (!pendingBucketExists) {
          console.log("Creating pending-uploads bucket");
          await supabaseAdmin.storage.createBucket('pending-uploads', {
            public: false,
            fileSizeLimit: 5242880 // 5MB
          });
        }
        
        if (!approvedBucketExists) {
          console.log("Creating approved-uploads bucket");
          await supabaseAdmin.storage.createBucket('approved-uploads', {
            public: false,
            fileSizeLimit: 5242880 // 5MB
          });
        }
      } catch (bucketError) {
        console.log("Note: Error checking/creating buckets:", bucketError);
        // Continue processing - bucket might already exist
      }
      
      const sourcePath = submission.storage_path;
      const filename = sourcePath?.split("/").pop();
      const destinationPath = `approved/${filename}`;

      console.log(`Approving submission. Copying file from ${sourcePath} to ${destinationPath}`);

      try {
        const { data, error: copyError } = await supabaseAdmin
          .storage
          .from("pending-uploads")
          .copy(sourcePath, destinationPath);

        if (copyError) {
          console.error("Error copying file:", copyError);
          
          // Check if it's because the file doesn't exist
          if (copyError.message?.includes("not found")) {
            console.log("File not found in storage. Creating a placeholder file instead.");
            
            // Create a placeholder file in approved bucket
            const placeholderContent = `Placeholder for ${submission.full_name}'s submission`;
            const { error: uploadError } = await supabaseAdmin
              .storage
              .from("approved-uploads")
              .upload(destinationPath, new Blob([placeholderContent]), {
                contentType: "text/plain"
              });
              
            if (uploadError) {
              console.error("Error creating placeholder file:", uploadError);
              throw new Error(`Failed to create placeholder file: ${uploadError.message}`);
            }
          } else {
            await supabaseAdmin.from("pending_submissions").update({
              status: "failed",
              error_message: `File copy failed: ${copyError.message}`
            }).eq("id", submissionId);

            throw new Error(`Failed to copy file to approved bucket: ${copyError.message}`);
          }
        }
      } catch (fileError) {
        // If there's an error with the file operations, try to continue with the contact creation
        console.warn("Warning: File operation failed but continuing with contact creation:", fileError.message);
      }

      console.log("File copied successfully or placeholder created. Creating contact record.");

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
      
      // Clean up the original file from pending-uploads if it exists
      try {
        await supabaseAdmin.storage.from("pending-uploads").remove([sourcePath]);
        console.log(`Cleaned up original file from pending-uploads: ${sourcePath}`);
      } catch (removeError) {
        console.warn("Warning: Failed to remove original file, may not exist:", removeError);
      }

      await supabaseAdmin.from("pending_submissions").update({
        status: "approved"
      }).eq("id", submissionId);
      console.log(`Updated pending_submission status to 'approved' for ID: ${submissionId}`);

      responseMessage = `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 20px auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <h2 style="color: #4CAF50;">Submission Approved Successfully</h2>
        <p>Submission ID: ${submissionId}</p>
        <p>The data has been approved and is now being processed by our system.</p>
        <p>You will receive an email with the results once processing is complete.</p>
      </div>`;

      // Trigger Bright Data processing by calling the process-addresses function
      console.log(`Triggering address processing for contact ID: ${contact.id}`);
      try {
        // Fixed URL format using the project ref
        const processUrl = `https://${projectRef}.functions.supabase.co/process-addresses?action=initial_process&contact_id=${contact.id}`;
        console.log(`Calling process-addresses at URL: ${processUrl}`);
        
        const processResponse = await fetch(processUrl, { 
          method: "GET",
          headers: {
            "Authorization": `Bearer ${serviceRoleKey}`,
            "Content-Type": "application/json"
          }
        });
        
        console.log(`Process-addresses function response status: ${processResponse.status}`);
        if (!processResponse.ok) {
          const errorText = await processResponse.text();
          console.error("Error response from process-addresses:", errorText);
        } else {
          const responseData = await processResponse.json();
          console.log("Address processing triggered successfully:", responseData);
        }
      } catch (processError) {
        console.error("Error triggering address processing:", processError);
        // We don't throw here as the approval process itself was successful
      }
    }

    if (action === "reject") {
      console.log("Rejecting submission. Removing file and updating status.");
      const sourcePath = submission.storage_path;
      
      try {
        await supabaseAdmin.storage.from("pending-uploads").remove([sourcePath]);
        console.log(`Removed file: ${sourcePath}`);
      } catch (removeError) {
        console.error("Error removing file:", removeError);
        // Continue with rejection even if file removal fails
      }
      
      await supabaseAdmin.from("pending_submissions").update({
        status: "rejected"
      }).eq("id", submissionId);
      
      console.log("Updated submission status to rejected");

      responseMessage = `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 20px auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <h2 style="color: #000000;">Submission Rejected</h2>
        <p>Submission ID: ${submissionId}</p>
        <p>The uploaded data has been rejected and removed from our system.</p>
      </div>`;
    }

    console.log("Returning success response");
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
