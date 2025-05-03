
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

    // Parse request body and log it for debugging
    let body;
    try {
      body = await req.json();
      console.log("Received request body:", JSON.stringify(body));
    } catch (parseError) {
      console.error("Error parsing request body:", parseError);
      throw new Error(`Failed to parse request body: ${parseError.message}`);
    }

    // Validate required fields
    const { full_name, email, company, position, phone, storagePath } = body;

    console.log("Extracted fields from body:", {
      full_name,
      email,
      company,
      position,
      phone,
      storagePath
    });

    if (!full_name) {
      throw new Error("Missing required field: full_name");
    }
    if (!email) {
      throw new Error("Missing required field: email");
    }
    if (!storagePath) {
      throw new Error("Missing required field: storagePath");
    }

    // Track important API calls
    console.log(`✅ Creating Supabase admin client for ${supabaseUrl}`);
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
    
    console.log(`✅ Creating Supabase user client for ${supabaseUrl}`);
    const supabaseUserClient = createClient(supabaseUrl, supabaseAnonKey); // For signed URL

    // 1. Record the initial submission attempt
    console.log("Preparing to record submission in database");
    
    // Prepare database record
    const submissionRecord = {
      full_name,
      email,
      company: company || null,
      position: position || null,
      phone: phone || null,
      storage_path: storagePath,
      status: "pending",
    };
    
    console.log("Submission record to insert:", submissionRecord);
    
    // Insert into database
    let submissionId;
    try {
      const { data, error } = await supabaseAdmin
        .from("pending_submissions")
        .insert(submissionRecord)
        .select()
        .single();

      if (error) {
        console.error("Error inserting into pending_submissions:", error);
        throw new Error(`Failed to record submission: ${error.message}`);
      }

      if (!data) {
        console.error("No data returned from insert");
        throw new Error("Failed to record submission: No data returned");
      }

      submissionId = data.id;
      console.log(`Submission recorded with ID: ${submissionId}`);
    } catch (dbError) {
      console.error("Database error:", dbError);
      // Try to provide more context about the error
      throw new Error(`Database error: ${dbError.message}`);
    }

    // 2. Download the file content from Storage
    console.log(`Attempting to download file from path: ${storagePath}`);
    const { data: fileData, error: downloadError } = await supabaseAdmin.storage
      .from("pending-uploads") // Ensure this matches your bucket name
      .download(storagePath);

    if (downloadError) {
      console.error("Error downloading file from storage:", downloadError);
      // Attempt to update status to failed before throwing
      await supabaseAdmin
        .from("pending_submissions")
        .update({ status: "failed", error_message: `File download failed: ${downloadError.message}` })
        .eq("id", submissionId);
      throw new Error(`Failed to download file: ${downloadError.message}`);
    }

    if (!fileData) {
      await supabaseAdmin
        .from("pending_submissions")
        .update({ status: "failed", error_message: "File download returned no data." })
        .eq("id", submissionId);
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
    const timestamp = new Date().getTime();
    const functionUrl = `${supabaseUrl}/functions/v1/process-approval`;
    const approveUrl = `${functionUrl}?id=${submissionId}&action=approve&t=${timestamp}`;
    const rejectUrl = `${functionUrl}?id=${submissionId}&action=reject&t=${timestamp}`;

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
    console.log(`Sending email to ${approverEmail}`);
    const currentTime = new Date().toLocaleTimeString();
    const emailPayload = {
      personalizations: [{ to: [{ email: approverEmail }] }],
      from: { email: senderEmail, name: "Lintels Submission" }, // Use configured sender
      subject: `Approval Required: New Address List Submission (${full_name}) - ${currentTime}`,
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
    
    // Monitoring variables for SendGrid
    let emailSent = false;
    let emailError = null;
    let retryAttempts = 0;
    const MAX_RETRIES = 2;
    
    // Try sending the email with retries
    while (!emailSent && retryAttempts <= MAX_RETRIES) {
      try {
        retryAttempts++;
        console.log(`SendGrid attempt ${retryAttempts} of ${MAX_RETRIES + 1}`);
        
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
          emailError = `${sendgridResponse.status}: ${errorBody}`;
          
          // If we have retries left, wait and try again
          if (retryAttempts <= MAX_RETRIES) {
            console.log(`Waiting before retry ${retryAttempts}...`);
            await new Promise(resolve => setTimeout(resolve, 1000 * retryAttempts));
            continue;
          }
          
          throw new Error(`Failed to send email via SendGrid: ${sendgridResponse.statusText}. ${errorBody}`);
        }
        
        // If we got here, email was sent successfully
        emailSent = true;
        console.log(`Email sent successfully to ${approverEmail} on attempt ${retryAttempts}`);
      } catch (sendgridError) {
        console.error(`SendGrid attempt ${retryAttempts} failed:`, sendgridError);
        emailError = sendgridError.message;
        
        // If we have retries left, wait and try again
        if (retryAttempts <= MAX_RETRIES) {
          console.log(`Waiting before retry ${retryAttempts}...`);
          await new Promise(resolve => setTimeout(resolve, 1000 * retryAttempts));
          continue;
        }
        
        // We've run out of retries
        break;
      }
    }
    
    // If all SendGrid attempts failed, try backup notification
    if (!emailSent) {
      console.log("All SendGrid attempts failed. Updating submission status...");
      
      // Update the submission status
      await supabaseAdmin
        .from("pending_submissions")
        .update({ 
          status: "notification_pending",  // Special status to indicate we need to notify later
          error_message: `Email delivery failed: ${emailError}` 
        })
        .eq("id", submissionId);
        
      console.log("Updated submission status to notification_pending");
      
      // Insert into contacts table as a fallback
      try {
        console.log("Creating fallback record in contacts table");
        const { error: contactError } = await supabaseAdmin
          .from("contacts")
          .insert({
            full_name,
            email,
            company,
            position, 
            phone,
            form_type: "sample",
            status: "pending_review",
          });
          
        if (contactError) {
          console.error("Failed to create fallback contact record:", contactError);
        } else {
          console.log("Created fallback record in contacts table");
        }
      } catch (fallbackError) {
        console.error("Error creating fallback record:", fallbackError);
      }
    }

    // 7. Return success response to frontend
    return new Response(
      JSON.stringify({
        success: true,
        message: emailSent
          ? `Submission received. Approval email sent to administrator. Submission ID: ${submissionId}`
          : `Submission received, but notification delayed. Your request will be processed. Submission ID: ${submissionId}`,
        submissionId,
        emailSent,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (err) {
    console.error("❌ ERROR in notify-admin function:", err);
    return new Response(
      JSON.stringify({ 
        error: err.message,
        stack: err.stack,  // Include stack trace for better debugging
      }),
      {
        status: err.message.includes("Method Not Allowed") ? 405 : 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
