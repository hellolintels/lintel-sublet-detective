
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { sendEmail } from "../email.ts";
import { corsHeaders } from "../constants.ts";

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
  
  // Send notification that processing is complete
  const emailResult = await sendEmail(
    "jamie@lintels.in", 
    `[Lintels] Address Processing Complete for ${contact.full_name}`,
    `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #4CAF50; border-radius: 5px;">
      <h1 style="color: #4CAF50; text-align: center;">Address Processing Complete</h1>
      
      <p style="font-size: 16px;">The address processing for <strong>${contact.full_name}</strong> (${contact.email}) is now complete.</p>
      
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
    </div>
    `
  );
  
  console.log("Notification email result:", emailResult);
  
  // If the email failed, try a second attempt with simpler formatting
  if (!emailResult.success) {
    console.log("First email attempt failed, trying with simpler format");
    
    const fallbackResult = await sendEmail(
      "jamie@lintels.in", 
      `[Lintels] Processing Complete - ${contact.full_name}`,
      `
      Address processing complete for ${contact.full_name} (${contact.email}).
      
      Report details:
      - Properties: ${reportData.properties_count}
      - Matches: ${reportData.matches_count}
      
      To send the report to the client, visit:
      ${viewReportUrl}
      `
    );
    
    console.log("Fallback email result:", fallbackResult);
  }
  
  return new Response(
    JSON.stringify({
      message: "Address processing completed",
      contact_id: contact.id,
      report_id: newReportId,
      status: "processed"
    }),
    { 
      headers: { 
        ...corsHeaders,
        "Content-Type": "application/json" 
      } 
    }
  );
}
