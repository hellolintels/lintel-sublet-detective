
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { sendEmail } from "../email.ts";
import { countAddressRows } from "../file-processing.ts";
import { corsHeaders } from "../constants.ts";

/**
 * Handle initial processing of contact's address file
 * @param supabase Supabase client
 * @param contact Contact details
 * @param supabaseUrl Supabase URL for creating links
 * @returns Response object
 */
export async function handleInitialProcess(supabase: ReturnType<typeof createClient>, contact: any, supabaseUrl: string) {
  console.log("Starting initial process for contact:", contact.id);
  console.log("Contact email:", contact.email);
  console.log("Contact has file data:", !!contact.file_data);
  console.log("Contact file type:", contact.file_type);
  console.log("Contact file name:", contact.file_name);
  
  let rowCount = 0;
  let countingError = null;
  
  // Check if the address file has too many rows - with improved error handling
  if (contact.file_data) {
    try {
      rowCount = countAddressRows(contact.file_data);
      console.log(`Address file contains ${rowCount} rows`);
    } catch (error) {
      countingError = error;
      console.error("Error counting rows in file data:", error);
      
      // Update status to indicate processing error
      await supabase
        .from("contacts")
        .update({ status: "processing_error" })
        .eq("id", contact.id);
        
      // Even if row counting fails, still try to send a notification about the issue
      await sendEmail(
        "jamie@lintels.in",
        `[URGENT] [Lintels] Error Processing Submission from ${contact.full_name}`,
        `
        <div>
          <h1>Error Processing Submission</h1>
          <p>There was an error processing the submission from ${contact.full_name} (${contact.email}):</p>
          <p>Error: ${error.message || "Unknown error"}</p>
          <p>You may need to manually check the file format.</p>
        </div>
        `
      );
      
      // Don't throw here - return a response indicating the issue
      return new Response(
        JSON.stringify({
          message: "Error processing address file, but notification sent",
          status: "error",
          contact_id: contact.id,
        }),
        { 
          headers: { 
            ...corsHeaders,
            "Content-Type": "application/json" 
          } 
        }
      );
    }
    
    // Handle case where too many addresses are provided
    if (rowCount > 20) {
      console.log("Too many addresses detected, sending notification");
      
      // Update status to indicate too many addresses
      await supabase
        .from("contacts")
        .update({ status: "too_many_addresses" })
        .eq("id", contact.id);
        
      // Send notification about too many addresses
      const emailResult = await sendEmail(
        contact.email,
        "Your Lintels Address Submission Exceeds Limit",
        `
        <div>
          <h1>Address Submission Exceeds Limit</h1>
          <p>Hello ${contact.full_name},</p>
          <p>Your submission contains ${rowCount} addresses, which exceeds the 20 address limit for sample reports.</p>
          <p>Please submit a file with fewer addresses to receive a sample report.</p>
          <p>Thank you for your interest in Lintels.</p>
        </div>
        `
      );
      
      console.log("Email sending result for too many addresses:", emailResult);
      
      return new Response(
        JSON.stringify({
          message: "Address file contains too many rows (limit: 20)",
          status: "error",
          contact_id: contact.id,
          email_sent: emailResult.success
        }),
        { 
          headers: { 
            ...corsHeaders,
            "Content-Type": "application/json" 
          } 
        }
      );
    }
  } else {
    console.log("No file data found in contact record");
  }
  
  // Set contact status to pending approval
  console.log("Updating contact status to pending_approval");
  const { error: updateError } = await supabase
    .from("contacts")
    .update({ status: "pending_approval" })
    .eq("id", contact.id);
    
  if (updateError) {
    console.error("Error updating contact status:", updateError);
    throw updateError;
  }
  
  console.log(`Updated contact status to 'pending_approval'`);
  
  // Create approval URL for the link
  const approvalUrl = `${supabaseUrl}/functions/v1/process-addresses`;
  console.log("Using approval URL:", approvalUrl);
  
  const adminEmailSubject = `[URGENT] [Lintels] New Address Submission from ${contact.full_name} - Approval Required`;
  
  // Make sure we're sending a direct clickable link without relying on HTML styling
  const adminEmailContent = `
  <div>
    <h1>New Address Submission - REQUIRES YOUR APPROVAL</h1>
    <p>A new address file has been submitted by ${contact.full_name} (${contact.email}) at ${contact.company}.</p>
    <p><strong>File details:</strong></p>
    <ul>
      <li>File name: ${contact.file_name || "Unnamed file"}</li>
      <li>Contains ${rowCount} addresses</li>
    </ul>
    
    <p><strong>To approve processing this request, click this link:</strong></p>
    <p><a href="${approvalUrl}?action=approve_processing&contact_id=${contact.id}" style="font-size: 16px; font-weight: bold;">APPROVE PROCESSING</a></p>
    
    <p>If the button above doesn't work, copy and paste this URL into your browser:</p>
    <p>${approvalUrl}?action=approve_processing&contact_id=${contact.id}</p>
    
    <p>Thank you,<br>Lintels System</p>
  </div>
  `;
  
  // Send the admin notification with both subject and content marked urgent
  console.log("Sending admin notification with high priority flags");
  
  try {
    // First attempt
    const emailResult = await sendEmail(
      "jamie@lintels.in", 
      adminEmailSubject,
      adminEmailContent
    );
    
    console.log("Admin email sending result (first attempt):", emailResult);
    
    if (!emailResult.success) {
      console.log("First attempt failed, trying second attempt with delay");
      
      // Wait 1 second before second attempt
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Second attempt
      const retryResult = await sendEmail(
        "jamie@lintels.in", 
        adminEmailSubject,
        adminEmailContent
      );
      
      console.log("Admin email sending result (second attempt):", retryResult);
    }
  } catch (emailError) {
    console.error("Critical error sending admin email:", emailError);
    // Continue execution despite email error - don't block the user flow
  }
  
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
