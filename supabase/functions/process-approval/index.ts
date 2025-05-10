import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const submissionId = url.searchParams.get("id");
    const action = url.searchParams.get("action");

    if (!submissionId || !action || !["approve", "reject"].includes(action)) {
      return new Response("Missing required parameters.", {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "text/plain" }
      });
    }

    console.log(`Processing ${action} for submission ${submissionId}`);

    const { data: submission, error: fetchError } = await supabaseAdmin
      .from("pending_submissions")
      .select("*")
      .eq("id", submissionId)
      .single();

    if (fetchError || !submission) {
      throw new Error(
        `Submission not found or error fetching: ${fetchError?.message}`
      );
    }

    if (submission.status !== "pending") {
      return new Response(`Submission already processed (Status: ${submission.status}).`, {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "text/plain" }
      });
    }

    let message = "";

    if (action === "approve") {
      const sourcePath = submission.storage_path;
      const filename = sourcePath.split("/").pop();
      const destinationPath = `approved-uploads/${filename}`;

      const { error: copyError } = await supabaseAdmin.storage
        .from("pending-uploads")
        .copy(sourcePath, destinationPath);

      if (copyError) {
        await supabaseAdmin
          .from("pending_submissions")
          .update({ status: "failed", error_message: copyError.message })
          .eq("id", submissionId);

        throw new Error(`Failed to copy file to approved bucket: ${copyError.message}`);
      }

      const { error: insertError } = await supabaseAdmin.from("contacts").insert({
        full_name: submission.full_name,
        email: submission.email,
        company: submission.company,
        position: submission.position,
        phone: submission.phone,
        approved_file_path: destinationPath,
        status: "approved"
      });

      if (insertError) {
        await supabaseAdmin
          .from("pending_submissions")
          .update({ status: "failed", error_message: insertError.message })
          .eq("id", submissionId);

        throw new Error(`Failed to insert contact: ${insertError.message}`);
      }

      await supabaseAdmin.storage.from("pending-uploads").remove([sourcePath]);

      await supabaseAdmin
        .from("pending_submissions")
        .update({ status: "approved" })
        .eq("id", submissionId);

      console.log("✅ Submission approved and file moved.");
      message = `Submission ${submissionId} approved successfully.`;
    }

    if (action === "reject") {
      const sourcePath = submission.storage_path;

      await supabaseAdmin.storage.from("pending-uploads").remove([sourcePath]);

      await supabaseAdmin
        .from("pending_submissions")
        .update({ status: "rejected" })
        .eq("id", submissionId);

      console.log("🚫 Submission rejected and file deleted.");
      message = `Submission ${submissionId} rejected and file deleted.`;
    }

    return new Response(`<html><body><h1>Action Complete</h1><p>${message}</p></body></html>`, {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "text/html" }
    });
  } catch (err) {
    console.error("❌ ERROR:", err.message);
    return new Response(
      `<html><body><h1>Error Processing Request</h1><p>An error occurred: ${err.message}</p></body></html>`,
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "text/html" }
      }
    );
  }
});
