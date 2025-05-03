
// Trigger redeploy

// supabase/functions/notify-admin/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { Buffer } from "https://deno.land/std@0.168.0/io/buffer.ts";

// --- Interfaces ---
interface UserDetails {
  full_name: string;
  email: string;
  company?: string;
  position?: string;
  phone?: string;
}

interface SubmissionData extends UserDetails {
  storagePath: string; // Path to the uploaded file in Supabase Storage
}

// --- Environment Variables ---
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const sendgridApiKey = Deno.env.get("SENDGRID_API_KEY")!;
const approverEmail = Deno.env.get("APPROVER_EMAIL")!;
const senderEmail = Deno.env.get("SENDER_EMAIL")!;
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!; // Needed for generating signed URLs

// --- Main Function Logic ---
serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    console.log("Handling OPTIONS preflight request");
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    console.log(`notify-admin function called with method: ${req.method}`);

    if (req.method !== "POST") {
      throw new Error("Method Not Allowed: Only POST requests are accepted.");
    }

    const body: SubmissionData = await req.json();
    console.log("Received body:", body);

    const { full_name, email, company, position, phone, storagePath } = body;

    if (!full_name || !email || !storagePath) {
      throw new Error("Missing required fields: full_name, email, and storagePath are required.");
    }

    // Track important API calls
    console.log(`✅ Creating Supabase admin client for ${supabaseUrl}`);
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
    
    console.log(`✅ Creating Supabase user client for ${supabaseUrl}`);
    const supabaseUserClient = createClient(supabaseUrl, supabaseAnonKey); // For signed URL

    // 1. Record the initial submission attempt
    console.log("Recording submission in database");
    const { data: submissionRecord, error: submissionError } = await supabaseAdmin
      .from("pending_submissions")
      .insert({
        full_name,
        email,
        company,
        position,
        phone,
        storage_path: storagePath,
        status: "pending",
      })
      .select()
      .single();

    if (submissionError) {
      console.error("Error inserting into pending_submissions:", submissionError);
      throw new Error(`Failed to record submission: ${submissionError.message}`);
    }

    const submissionId = submissionRecord.id;
    console.log(`Submission recorded with ID: ${submissionId}`);

    // 2. Download the file content from Storage
    console.log(`Attempting to download file from path: ${storagePath}`);
    const { data: fileData, error: downloadError } = await supabaseAdmin.storage
      .from("pending-uploads") // Ensure this matches your bucket name
      .download(storagePath);

    if (downloadError) {
      console.error("Error downloading file from storage:", downloadError);
      // Attempt to update status to failed before throwing
      await supabaseAdmin.from("pending_submissions").update({ status: "failed", error_message: `File download failed: ${downloadError.message}` }).eq("id", submissionId);
      throw new Error(`Failed to download file: ${downloadError.message}`);
    }

    if (!fileData) {
      await supabaseAdmin.from("pending_submissions").update({ status: "failed", error_message: "File download returned no data." }).eq("id", submissionId);
      throw new Error("File download returned no data.");
    }

    console.log(`File downloaded successfully, size: ${fileData.size} bytes`);

    // 3. Process file content (ensure it's plain text CSV)
    const fileContentArrayBuffer = await fileData.arrayBuffer();
    const fileContentString = new TextDecoder().decode(fileContentArrayBuffer);
    const fileContentBase64 = btoa(fileContentString); // Encode as Base64 for SendGrid attachment

    // Extract original filename from path
    const fileName = storagePath.split("/").pop() || "submitted_data.csv";

    // 4. Generate unique approval/rejection URLs
    // Use signed URLs for the process-approval function
    const functionUrl = `${supabaseUrl}/functions/v1/process-approval`;
    const approveUrl = `${functionUrl}?id=${submissionId}&action=approve`;
    const rejectUrl = `${functionUrl}?id=${submissionId}&action=reject`;

    // 5. Build Email Content
    const htmlContent = `
      <h1>New Address List Submission for Approval</h1>
      <p>A new address list has been submitted by ${full_name} (${email}).</p>
      <h2>Contact Details:</h2>
      <ul>
        <li><strong>Full Name:</strong> ${full_name}</li>
        <li><strong>Email:</strong> ${email}</li>
        <li><strong>Company:</strong> ${company || "Not provided"}</li>
        <li><strong>Position:</strong> ${position || "Not provided"}</li>
        <li><strong>Phone:</strong> ${phone || "Not provided"}</li>
        <li><strong>Submission ID:</strong> ${submissionId}</li>
      </ul>
      <p>The submitted file (${fileName}) is attached for your review.</p>
      <p><strong>Please approve or reject this submission:</strong></p>
      <p>
        <a href="${approveUrl}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-align: center; text-decoration: none; display: inline-block; border-radius: 5px; margin-right: 10px;">Approve</a>
        <a href="${rejectUrl}" style="background-color: #f44336; color: white; padding: 10px 20px; text-align: center; text-decoration: none; display: inline-block; border-radius: 5px;">Reject</a>
      </p>
      <p>Sent at: ${new Date().toISOString()}</p>
    `;

    const textContent = `
      New address list submission for approval from ${full_name} (${email}).
      Submission ID: ${submissionId}
      File: ${fileName}
      Contact Details:
      - Full Name: ${full_name}
      - Email: ${email}
      - Company: ${company || "Not provided"}
      - Position: ${position || "Not provided"}
      - Phone: ${phone || "Not provided"}

      The submitted file is attached.

      Approve: ${approveUrl}
      Reject: ${rejectUrl}
      
      Sent at: ${new Date().toISOString()}
    `;

    // 6. Send Email via SendGrid
    console.log(`Sending email to ${approverEmail}`)
    const emailPayload = {
      personalizations: [{ to: [{ email: approverEmail }] }],
      from: { email: senderEmail, name: "Lintels Submission" }, // Use configured sender
      subject: `Approval Required: New Address List Submission (${full_name})`,
      content: [
        { type: "text/plain", value: textContent },
        { type: "text/html", value: htmlContent },
      ],
      attachments: [
        {
          content: fileContentBase64,
          filename: fileName,
          type: "text/csv", // Assuming CSV
          disposition: "attachment",
        },
      ],
    };

    console.log("Sending email via SendGrid...");
    const sendgridResponse = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${sendgridApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(emailPayload),
    });

    if (!sendgridResponse.ok) {
      const errorBody = await sendgridResponse.text();
      console.error(`SendGrid error: ${sendgridResponse.status} ${sendgridResponse.statusText}`, errorBody);
      
      // Attempt a direct backup notification to a different email if primary fails
      try {
        console.log("Attempting backup notification to secondary email...");
        const backupEmailPayload = {
          personalizations: [{ to: [{ email: "support@lintels.in" }] }],
          from: { email: senderEmail, name: "Lintels Submission (Backup)" },
          subject: `BACKUP: New Address List Submission (${full_name})`,
          content: [
            { type: "text/plain", value: `BACKUP NOTIFICATION: Primary email failed. ${textContent}` },
            { type: "text/html", value: `<p><strong>BACKUP NOTIFICATION: Primary email failed.</strong></p>${htmlContent}` },
          ],
          attachments: [
            {
              content: fileContentBase64,
              filename: fileName,
              type: "text/csv",
              disposition: "attachment",
            },
          ],
        };
        
        await fetch("https://api.sendgrid.com/v3/mail/send", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${sendgridApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(backupEmailPayload),
        });
        console.log("Backup notification sent");
      } catch (backupError) {
        console.error("Backup notification also failed:", backupError);
      }
      
      // Update status but don't throw yet
      await supabaseAdmin.from("pending_submissions").update({ 
        status: "notification_failed", 
        error_message: `SendGrid failed: ${sendgridResponse.statusText}. Error: ${errorBody}` 
      }).eq("id", submissionId);
      
      throw new Error(`Failed to send email via SendGrid: ${sendgridResponse.statusText}. ${errorBody}`);
    }

    console.log(`Email sent successfully to ${approverEmail}`);

    // 7. Return success response to frontend
    return new Response(
      JSON.stringify({
        success: true,
        message: `Submission received. Approval email sent to ${approverEmail}. Submission ID: ${submissionId}`,
        submissionId: submissionId,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (err) {
    console.error("❌ ERROR in notify-admin function:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      {
        status: err.message.includes("Method Not Allowed") ? 405 : 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
