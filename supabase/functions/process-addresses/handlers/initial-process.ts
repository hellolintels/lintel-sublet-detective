
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
  
  // Create approval URL for the link - use the full URL to ensure proper linking
  const approvalUrl = `${supabaseUrl}/functions/v1/process-addresses`;
  console.log("Using approval URL:", approvalUrl);
  
  const adminEmailSubject = `[URGENT] [Lintels] New Address Submission from ${contact.full_name} - Approval Required`;
  
  // Create a clear and highly visible admin notification
  const adminEmailContent = `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 2px solid #FF5722; border-radius: 5px;">
    <h1 style="color: #FF5722; text-align: center;">⚠️ URGENT ACTION REQUIRED ⚠️</h1>
    <h2 style="color: #333;">New Address Submission Needs Approval</h2>
    
    <p style="font-size: 16px;">A new address file has been submitted by <strong>${contact.full_name}</strong> (${contact.email}) at ${contact.company}.</p>
    
    <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 15px 0;">
      <h3 style="margin-top: 0;">File Details:</h3>
      <ul>
        <li>File name: ${contact.file_name || "Unnamed file"}</li>
        <li>Contains ${rowCount} addresses</li>
      </ul>
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${approvalUrl}?action=approve_processing&contact_id=${contact.id}" 
         style="background-color: #FF5722; color: white; padding: 15px 25px; text-decoration: none; font-weight: bold; font-size: 18px; border-radius: 5px; display: inline-block;">
        APPROVE PROCESSING
      </a>
    </div>
    
    <p>If the button above doesn't work, copy and paste this URL into your browser:</p>
    <p style="background-color: #f5f5f5; padding: 10px; word-break: break-all; font-family: monospace;">
      ${approvalUrl}?action=approve_processing&contact_id=${contact.id}
    </p>
    
    <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;" />
    
    <p style="color: #777; font-size: 14px;">
      This is an automated message from the Lintels system. Please do not reply to this email.
    </p>
  </div>
  `;
  
  console.log("Sending URGENT admin notification email");
  
  try {
    // First attempt to send admin email
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
      
      // Second attempt with backup method
      const retryResult = await sendEmail(
        "jamie@lintels.in", 
        adminEmailSubject + " [RETRY]",
        adminEmailContent
      );
      
      console.log("Admin email sending result (second attempt):", retryResult);
      
      // If still failing, try a third attempt with minimal formatting
      if (!retryResult.success) {
        console.log("Second attempt failed, trying third attempt with minimal formatting");
        
        const fallbackContent = `
        URGENT: New address submission from ${contact.full_name} (${contact.email})
        
        File: ${contact.file_name || "Unnamed file"}
        Addresses: ${rowCount}
        
        To approve processing, visit:
        ${approvalUrl}?action=approve_processing&contact_id=${contact.id}
        `;
        
        const fallbackResult = await sendEmail(
          "jamie@lintels.in",
          "CRITICAL: ADDRESS SUBMISSION REQUIRES APPROVAL",
          fallbackContent
        );
        
        console.log("Admin email sending result (third attempt):", fallbackResult);
      }
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
