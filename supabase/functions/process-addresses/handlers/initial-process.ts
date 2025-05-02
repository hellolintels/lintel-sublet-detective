// IMPORTANT: Only updating the part that handles the email notification
// The rest of the file remains the same

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { sendEmail } from "../email.ts";
import { corsHeaders } from "../constants.ts";
import { countAddressRows, extractFileDataForAttachment } from "../file-processing.ts";

const MAX_ALLOWED_ROWS = 20;

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
  
  // Count rows in the address file to determine processing approach
  const addressCount = await countAddressRows(contact.file_data);
  console.log(`Address file contains ${addressCount} rows`);
  
  // Check if address count exceeds maximum
  if (addressCount > MAX_ALLOWED_ROWS) {
    console.log(`Address count (${addressCount}) exceeds maximum allowed (${MAX_ALLOWED_ROWS})`);
    
    // Update contact status to indicate too many addresses
    const { error: updateError } = await supabase
      .from("contacts")
      .update({ 
        status: "too_many_addresses"
      })
      .eq("id", contact.id);
      
    if (updateError) {
      console.error("Error updating contact:", updateError);
      throw updateError;
    }
    
    // Send notification to user about the limit
    await sendEmail(
      contact.email,
      "Regarding Your Address List Submission - Lintels.in",
      `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ff6b6b; border-radius: 5px;">
        <h1 style="color: #ff6b6b; text-align: center;">Address List Limit Exceeded</h1>
        
        <p>Hello ${contact.full_name},</p>
        
        <p>Thank you for your interest in our services. We've received your address list submission, but we noticed that your file contains more than ${MAX_ALLOWED_ROWS} addresses.</p>
        
        <p>For our sample report service, we can only process up to ${MAX_ALLOWED_ROWS} addresses at a time. If you'd like to proceed with a sample report, please resubmit your form with a smaller list of addresses.</p>
        
        <p>If you need to process a larger dataset, please contact us at <a href="mailto:info@lintels.in">info@lintels.in</a> to discuss our full service options.</p>
        
        <p>We apologize for any inconvenience and look forward to assisting you.</p>
        
        <p style="text-align: center; font-size: 12px; color: #666; margin-top: 20px;">
          This is an automated message from lintels.in
        </p>
      </div>
      `
    );
    
    // Alert admin about the oversized submission via the notify-admin function
    try {
      console.log("Calling notify-admin function for oversized submission");
      const notifyResponse = await fetch(`${supabaseUrl}/functions/v1/notify-admin`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`
        },
        body: JSON.stringify({ 
          contactId: contact.id,
        })
      });
      
      if (notifyResponse.ok) {
        console.log("Notify-admin function called successfully for oversized submission");
      } else {
        console.error("Error calling notify-admin function:", await notifyResponse.text());
      }
    } catch (error) {
      console.error("Exception calling notify-admin for oversized submission:", error);
    }
    
    return new Response(
      JSON.stringify({
        message: "Address file exceeds maximum allowed rows",
        contact_id: contact.id,
        status: "too_many_addresses",
        email_sent: true
      }),
      { 
        headers: { 
          ...corsHeaders,
          "Content-Type": "application/json" 
        } 
      }
    );
  }
  
  // Update contact status
  console.log(`Updating contact status to pending_approval`);
  const { error: updateError } = await supabase
    .from("contacts")
    .update({ 
      status: "pending_approval"
    })
    .eq("id", contact.id);
    
  if (updateError) {
    console.error("Error updating contact:", updateError);
    throw updateError;
  }
  console.log(`Updated contact status to 'pending_approval'`);
  
  // Construct approval URL
  const approvalUrl = `${supabaseUrl}/functions/v1/process-addresses`;
  const approvalLink = `${approvalUrl}?action=approve_processing&contact_id=${contact.id}`;
  console.log(`Using approval URL: ${approvalUrl}`);
  console.log(`Approval link: ${approvalLink}`);
  
  // Call notify-admin function to ensure admin gets notified with attachment
  try {
    console.log("Calling notify-admin function with contact ID:", contact.id);
    const notifyResult = await fetch(`${supabaseUrl}/functions/v1/notify-admin`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`
      },
      body: JSON.stringify({ contactId: contact.id })
    });
    
    if (notifyResult.ok) {
      const notifyResponse = await notifyResult.json();
      console.log("Notify admin response:", notifyResponse);
      if (notifyResponse.withAttachment) {
        console.log("Email sent with attachment successfully");
      } else {
        console.warn("Email sent without attachment");
      }
    } else {
      console.error("Notify admin function returned error status:", notifyResult.status);
      const errorText = await notifyResult.text();
      console.error("Error details:", errorText);
      throw new Error(`Failed to notify admin: ${errorText}`);
    }
  } catch (notifyError) {
    console.error("Error calling notify-admin function:", notifyError);
    throw notifyError;
  }
  
  // Send confirmation email to customer with UK spelling
  const clientEmailResult = await sendEmail(
    contact.email,
    "We've Received Your Address List - Lintels.in",
    `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #2196F3; border-radius: 5px;">
      <h1 style="color: #2196F3; text-align: center;">Thank You for Your Submission</h1>
      
      <p>Hello ${contact.full_name},</p>
      
      <p>We've received your address list and will begin processing it shortly. You'll receive your sample report within 24 hours.</p>
      
      <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 15px 0;">
        <p><strong>What happens next?</strong></p>
        <ol style="margin-left: 20px; padding-left: 0;">
          <li>Our system will analyse your addresses against our database of short-term rental listings</li>
          <li>We'll compile a sample report showing potential matches</li>
          <li>You'll receive an email with the report results within 24 hours</li>
        </ol>
      </div>
      
      <p>If you have any questions in the meantime, please contact us at <a href="mailto:info@lintels.in">info@lintels.in</a>.</p>
      
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
      headers: { 
        ...corsHeaders,
        "Content-Type": "application/json" 
      } 
    }
  );
}
