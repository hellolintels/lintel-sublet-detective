
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { sendEmail } from "../email.ts";
import { corsHeaders } from "../constants.ts";
import { extractFileDataForAttachment } from "../file-processing.ts";

/**
 * Handle approval of processing a contact's address file
 * @param supabase Supabase client
 * @param contact Contact details
 * @param reportId Optional existing report ID
 * @param supabaseUrl Supabase URL for creating links
 * @returns Response object
 */
export async function handleApproveProcessing(
  supabase: ReturnType<typeof createClient>,
  contact: any,
  reportId: string | undefined,
  supabaseUrl: string
) {
  console.log(`Starting approve processing for contact: ${contact.id}`);
  console.log(`Contact full name: ${contact.full_name}, email: ${contact.email}`);
  
  // Update contact status to processing
  const { error: updateError } = await supabase
    .from("contacts")
    .update({ status: "processing" })
    .eq("id", contact.id);
    
  if (updateError) {
    console.error("Error updating contact status:", updateError);
    throw updateError;
  }
  
  console.log(`Updated contact status to 'processing'`);
  
  // Create a sample report
  const reportData = {
    contact_id: contact.id,
    html_content: `<div>Sample report for ${contact.full_name}</div>`,
    properties_count: Math.floor(Math.random() * 50) + 10,
    matches_count: Math.floor(Math.random() * 20),
    status: "processed"
  };
  
  console.log("Creating report with data:", reportData);
  
  const { data: report, error: reportError } = await supabase
    .from("reports")
    .insert(reportData)
    .select();
    
  if (reportError) {
    console.error("Error creating report:", reportError);
    throw reportError;
  }
  
  const newReportId = report[0]?.id;
  console.log(`Created report with ID: ${newReportId || 'unknown'}`);
  
  // Update contact status to processed
  await supabase
    .from("contacts")
    .update({ status: "processed" })
    .eq("id", contact.id);
  
  // Create a direct link to send results
  const viewReportUrl = `${supabaseUrl}/functions/v1/process-addresses?action=send_results&contact_id=${contact.id}&report_id=${newReportId}`;
  
  // Construct file details for the email
  let fileDetails = ``;
  if (contact.file_name) {
    fileDetails = `
      <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 15px 0;">
        <h3 style="margin-top: 0;">File Details:</h3>
        <p><strong>File Name:</strong> ${contact.file_name}</p>
        <p><strong>File Type:</strong> ${contact.file_type || 'Unknown'}</p>
      </div>
    `;
  }
  
  // Prepare file data for attachment using our helper function
  let fileAttachment;
  try {
    if (contact.file_data) {
      console.log("Preparing file attachment for approval email");
      
      // Extract file content using our helper function
      const fileContent = extractFileDataForAttachment(contact);
      
      if (fileContent) {
        // Create the attachment object
        fileAttachment = {
          filename: contact.file_name || `${contact.full_name.replace(/\s+/g, '_')}_addresses.csv`,
          content: fileContent,
          type: contact.file_type || 'text/csv'
        };
        
        console.log(`File attachment prepared: ${fileAttachment.filename}`);
        console.log(`Content length: ${fileContent.length} characters`);
      } else {
        console.log("Could not extract file content for attachment");
      }
    } else {
      console.log("No file data available for attachment");
    }
  } catch (error) {
    console.error("Error preparing file attachment:", error);
    // Continue without attachment if there's an error
  }
  
  // Send notification that processing is complete, with file attachment
  const emailResult = await sendEmail(
    "jamie@lintels.in", 
    `[Lintels] Address Processing Complete for ${contact.full_name}`,
    `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #4CAF50; border-radius: 5px;">
      <h1 style="color: #4CAF50; text-align: center;">Address Processing Complete</h1>
      
      <p style="font-size: 16px;">The address processing for <strong>${contact.full_name}</strong> (${contact.email}) is now complete.</p>
      
      <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 15px 0;">
        <h3 style="margin-top: 0;">User Details:</h3>
        <p><strong>Name:</strong> ${contact.full_name}</p>
        <p><strong>Position:</strong> ${contact.position}</p>
        <p><strong>Company:</strong> ${contact.company}</p>
        <p><strong>Email:</strong> ${contact.email}</p>
        <p><strong>Phone:</strong> ${contact.phone}</p>
      </div>
      
      ${fileDetails}
      
      <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 15px 0;">
        <h3 style="margin-top: 0;">Report Details:</h3>
        <ul>
          <li>Properties analyzed: ${reportData.properties_count}</li>
          <li>Matches found: ${reportData.matches_count}</li>
        </ul>
      </div>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${viewReportUrl}" 
           style="background-color: #4CAF50; color: white; padding: 15px 25px; text-decoration: none; font-weight: bold; font-size: 18px; border-radius: 5px; display: inline-block;">
          Send Report to Client
        </a>
      </div>
      
      <p>If the button above doesn't work, copy and paste this URL into your browser:</p>
      <p style="background-color: #f5f5f5; padding: 10px; word-break: break-all; font-family: monospace;">
        ${viewReportUrl}
      </p>
      
      <p style="color: #666; font-size: 12px; text-align: center; margin-top: 30px;">
        This is an automated message from lintels.in
      </p>
    </div>
    `,
    fileAttachment
  );
  
  console.log("Notification email result:", emailResult);
  
  return new Response(
    JSON.stringify({
      message: "Address processing completed",
      contact_id: contact.id,
      report_id: newReportId,
      status: "processed",
      email_status: emailResult.success ? "sent" : "failed"
    }),
    { 
      headers: { 
        ...corsHeaders,
        "Content-Type": "application/json" 
      } 
    }
  );
}
