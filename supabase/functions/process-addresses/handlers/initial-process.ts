import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { sendEmail } from "../email.ts";
import { corsHeaders } from "../constants.ts";
import { countAddressRows } from "../file-processing.ts";

/**
 * Handle initial processing of address data
 * @param supabase Supabase client
 * @param contact Contact details
 * @returns Response object
 */
export async function handleInitialProcess(
  supabase: ReturnType<typeof createClient>,
  contact: any
) {
  console.log(`Starting initial process for contact: ${contact.id}`);
  
  // Count rows in the address file to determine processing approach
  const addressCount = await countAddressRows(contact);
  console.log(`Address file contains ${addressCount} rows`);
  
  // Update contact status
  console.log(`Updating contact status to pending_approval`);
  const { error: updateError } = await supabase
    .from("contacts")
    .update({ status: "pending_approval" })
    .eq("id", contact.id);
    
  if (updateError) {
    console.error("Error updating contact:", updateError);
    throw updateError;
  }
  console.log(`Updated contact status to 'pending_approval'`);
  
  // Construct approval URL
  const functionUrl = Deno.env.get("SUPABASE_URL") || "";
  const approvalUrl = `${functionUrl}/functions/v1/process-addresses`;
  console.log(`Using approval URL: ${approvalUrl}`);
  
  // Send admin notification email
  console.log("Sending admin notification email");
  const adminEmailResult = await sendEmail(
    "jamie@lintels.in",
    `[Lintels] New Address Submission from ${contact.full_name}`,
    `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #2196F3; border-radius: 5px;">
      <h1 style="color: #2196F3; text-align: center;">New Address Submission</h1>
      
      <p>A new address list has been submitted for processing.</p>
      
      <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 15px 0;">
        <h3 style="margin-top: 0;">User Details:</h3>
        <ul>
          <li>Full Name: ${contact.full_name}</li>
          <li>Position: ${contact.position}</li>
          <li>Company: ${contact.company}</li>
          <li>Email: ${contact.email}</li>
          <li>Phone: ${contact.phone}</li>
          <li>Form Type: ${contact.form_type}</li>
        </ul>
        
        <h3>File Information:</h3>
        <ul>
          <li>File Name: ${contact.file_name}</li>
          <li>File Type: ${contact.file_type}</li>
          <li>Address Count: ${addressCount}</li>
        </ul>
      </div>
      
      <p>Review the submission and approve processing by clicking below:</p>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${approvalUrl}?contactId=${contact.id}&action=approve_processing" 
           style="background-color: #2196F3; color: white; padding: 12px 20px; text-decoration: none; font-weight: bold; border-radius: 5px; display: inline-block;">
          Approve Processing
        </a>
      </div>
      
      <p>Or use the API endpoint directly:</p>
      <pre style="background: #f5f5f5; padding: 10px; border-radius: 5px; font-size: 12px; overflow-x: auto;">
POST ${approvalUrl}
Content-Type: application/json

{
  "contactId": "${contact.id}",
  "action": "approve_processing"
}
      </pre>
      
      <p style="text-align: center; font-size: 12px; color: #666; margin-top: 20px;">
        This is an automated message from lintels.in
      </p>
    </div>
    `
  );
  
  console.log("Admin email sending result (first attempt):", adminEmailResult);
  
  // Send confirmation email to customer
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
          <li>Our system will analyze your addresses against our database of short-term rental listings</li>
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
      email_sent: adminEmailResult.success && clientEmailResult.success
    }),
    { 
      headers: { 
        ...corsHeaders,
        "Content-Type": "application/json" 
      } 
    }
  );
}
