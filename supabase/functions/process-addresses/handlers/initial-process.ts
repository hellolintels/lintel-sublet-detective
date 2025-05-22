
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { sendEmail } from "../email.ts";
import { corsHeaders } from "../constants.ts";
import { countAddressRows, extractFileDataForAttachment } from "../file-processing.ts";

const MAX_ALLOWED_ROWS = 120; // Increased from 20 to 120 rows

/**
 * Handle initial processing of address data
 * @param supabase Supabase client
 * @param contact Contact details
 * @returns Response object
 */
export async function handleInitialProcess(
  supabase: ReturnType<typeof createClient>,
  contact: any,
  supabaseUrl: string
) {
  console.log(`Starting initial process for contact: ${contact.id}`);
  console.log(`Contact full name: ${contact.full_name}, email: ${contact.email}`);
  console.log(`File name: ${contact.file_name}, File type: ${contact.file_type}`);
  console.log(`File data length: ${contact.file_data ? contact.file_data.length : 0}`);
  if (contact.file_data) {
    console.log(`Raw file_data first 50 chars: ${contact.file_data.substring(0, 50)}`);
  }

  const addressCount = await countAddressRows(contact.file_data);
  console.log(`Address file contains ${addressCount} rows`);

  // Enhanced logging to help debug the row count issue
  console.log(`MAX_ALLOWED_ROWS: ${MAX_ALLOWED_ROWS}, addressCount: ${addressCount}`);
  console.log(`addressCount > MAX_ALLOWED_ROWS: ${addressCount > MAX_ALLOWED_ROWS}`);
  console.log(`Comparison result (${addressCount} > ${MAX_ALLOWED_ROWS}): ${addressCount > MAX_ALLOWED_ROWS}`);

  // CRITICAL FIX: Ensure the comparison is properly evaluating addressCount
  // Ensure both values are treated as numbers
  const numericAddressCount = Number(addressCount);
  console.log(`Numeric addressCount: ${numericAddressCount}, type: ${typeof numericAddressCount}`);

  // Make the comparison completely explicit
  const isOverLimit = numericAddressCount > MAX_ALLOWED_ROWS;
  console.log(`Final comparison (${numericAddressCount} > ${MAX_ALLOWED_ROWS}): ${isOverLimit}`);

  if (isOverLimit) {
    console.log(`Address count (${numericAddressCount}) exceeds maximum allowed (${MAX_ALLOWED_ROWS})`);

    const { error: updateError } = await supabase
      .from("pending_submissions")
      .update({ status: "too_many_addresses" })
      .eq("id", contact.id);

    if (updateError) {
      console.error("Error updating contact:", updateError);
      throw updateError;
    }

    await sendEmail(
      contact.email,  // Send directly to the customer
      "Regarding Your Address List Submission - Lintels.in",
      `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ff6b6b; border-radius: 5px;">
        <h1 style="color: #ff6b6b; text-align: center;">Address List Limit Exceeded</h1>
        <p>Hello ${contact.full_name},</p>
        <p>Your file contains more than ${MAX_ALLOWED_ROWS} addresses.</p>
        <p>For a sample report, please resubmit with fewer addresses.</p>
        <p>For full service, contact us at <a href="mailto:info@lintels.in">info@lintels.in</a>.</p>
        <p style="text-align: center; font-size: 12px; color: #666; margin-top: 20px;">
          This is an automated message from lintels.in
        </p>
      </div>
      `
    );

    try {
      console.log("Calling notify-admin function for oversized submission");
      const notifyResponse = await fetch(`${supabaseUrl}/functions/v1/notify-admin`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`
        },
        body: JSON.stringify({ contactId: contact.id })
      });

      if (notifyResponse.ok) {
        console.log("Notify-admin function called successfully");
      } else {
        console.error("Error calling notify-admin:", await notifyResponse.text());
      }
    } catch (error) {
      console.error("Exception calling notify-admin:", error);
    }

    return new Response(
      JSON.stringify({
        message: "Address file exceeds maximum allowed rows",
        contact_id: contact.id,
        status: "too_many_addresses",
        email_sent: true
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }

  console.log(`Updating contact status to pending_approval`);
  const { error: updateError } = await supabase
    .from("pending_submissions")
    .update({ status: "pending_approval" })
    .eq("id", contact.id);

  if (updateError) {
    console.error("Error updating contact:", updateError);
    throw updateError;
  }
  console.log(`Updated contact status to 'pending_approval'`);

  // ✅ Update approval link to go through frontend
  const approvalLink = `https://lintels.in/approve?contact_id=${contact.id}`;
  console.log(`Approval link: ${approvalLink}`);

  try {
    console.log("Calling notify-admin function with contact ID:", contact.id);
    const notifyResult = await fetch(`${supabaseUrl}/functions/v1/notify-admin`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`
      },
      body: JSON.stringify({
        contactId: contact.id,
        approvalLink: approvalLink  // ✅ pass approvalLink to admin
      })
    });

    if (notifyResult.ok) {
      const notifyResponse = await notifyResult.json();
      console.log("Notify admin response:", notifyResponse);
    } else {
      console.error("Notify-admin function returned error:", notifyResult.status);
      const errorText = await notifyResult.text();
      console.error("Error details:", errorText);
      throw new Error(`Failed to notify admin: ${errorText}`);
    }
  } catch (notifyError) {
    console.error("Error calling notify-admin:", notifyError);
    throw notifyError;
  }

  // Send confirmation email to the customer
  const clientEmailResult = await sendEmail(
    contact.email,
    "We've Received Your Address List - Lintels.in",
    `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #2196F3; border-radius: 5px;">
      <h1 style="color: #2196F3; text-align: center;">Thank You for Your Submission</h1>
      <p>Hello ${contact.full_name},</p>
      <p>We've received your address list and will begin processing it shortly. You'll receive your sample report within 24 hours.</p>
      <p>If you have any questions, contact us at <a href="mailto:info@lintels.in">info@lintels.in</a>.</p>
      <p style="text-align: center; font-size: 12px; color: #666; margin-top: 20px;">
        This is an automated message from lintels.in
      </p>
    </div>
    `
  );

  console.log("Client confirmation email result:", clientEmailResult);

  return new Response(
    JSON.stringify({
      message: "Address data submitted for approval",
      contact_id: contact.id,
      status: "pending_approval",
      email_sent: true
    }),
    {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    }
  );
}
