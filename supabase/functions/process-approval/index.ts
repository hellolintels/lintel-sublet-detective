import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const submissionId = url.searchParams.get("id");
    const action = url.searchParams.get("action");

    if (!submissionId || (action !== "approve" && action !== "reject")) {
      return new Response(`<html><body><h1>Missing required parameters.</h1></body></html>`, {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "text/html" },
      });
    }

    const supabaseAdmin = createClient(supabaseUrl!, serviceRoleKey!);
    const { data: submission, error: fetchError } = await supabaseAdmin
      .from("pending_submissions")
      .select("*")
      .eq("id", submissionId)
      .single();

    if (fetchError || !submission) {
      return new Response(`<html><body><h1>Error Processing Request</h1><p>Submission not found or error fetching: ${fetchError?.message}</p></body></html>`, {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "text/html" },
      });
    }

    if (submission.status !== "pending") {
      return new Response(`<html><body><h1>Already Processed</h1><p>This submission has already been processed.</p></body></html>`, {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "text/html" },
      });
    }

    let responseMessage = "";

    if (action === "approve") {
      const sourcePath = submission.storage_path;
      const filename = sourcePath?.split("/").pop();
      const destinationPath = `approved/${filename}`;

      const { error: copyError } = await supabaseAdmin.storage
        .from("pending-uploads")
        .copy(sourcePath, destinationPath);

      if (copyError) {
        await supabaseAdmin.from("pending_submissions").update({
          status: "failed",
          error_message: `File copy failed: ${copyError.message}`,
        }).eq("id", submissionId);

        throw new Error(`Failed to copy file to approved bucket: ${copyError.message}`);
      }

      await supabaseAdmin.from("contacts").insert({
        full_name: submission.full_name,
        email: submission.email,
        company: submission.company,
        position: submission.position,
        phone: submission.phone,
        approved_file_path: destinationPath,
        status: "approved",
      });

      await supabaseAdmin.storage.from("pending-uploads").remove([sourcePath]);

      await supabaseAdmin.from("pending_submissions").update({
        status: "approved",
      }).eq("id", submissionId);

      responseMessage = `Submission ${submissionId} approved successfully.`;
    }

    if (action === "reject") {
      const sourcePath = submission.storage_path;

      await supabaseAdmin.storage.from("pending-uploads").remove([sourcePath]);

      await supabaseAdmin.from("pending_submissions").update({
        status: "rejected",
      }).eq("id", submissionId);

      responseMessage = `Submission ${submissionId} rejected successfully.`;
    }

    return new Response(`<html><body><h1>Action Complete</h1><p>${responseMessage}</p></body></html>`, {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "text/html" },
    });

  } catch (err) {
    console.error("❌ ERROR in process-approval function:", err);
    return new Response(`<html><body><h1>Error Processing Request</h1><p>${err.message}</p></body></html>`, {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "text/html" },
    });
  }
});
