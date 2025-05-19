
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { sendEmail } from "../email.ts";
import { corsHeaders } from "../constants.ts";
import { generateExcelReport } from "../utils/report-generator.ts";

/**
 * Handle sending results to the contact
 * @param supabase Supabase client
 * @param contact Contact details
 * @param reportId Report ID to send
 * @returns Response object
 */
export async function handleSendResults(
  supabase: ReturnType<typeof createClient>,
  contact: any,
  reportId: string | undefined
) {
  console.log(`Starting send results for contact: ${contact.id}, report: ${reportId}`);
  
  if (!reportId) {
    throw new Error("Report ID is required for sending results");
  }
  
  // Get the report data
  const { data: report, error: reportError } = await supabase
    .from("reports")
    .select("*")
    .eq("id", reportId)
    .single();
    
  if (reportError) {
    console.error("Error fetching report:", reportError);
    throw reportError;
  }
  
  if (!report) {
    throw new Error(`Report with ID ${reportId} not found`);
  }
  
  console.log(`Found report: ${report.id} with ${report.matches_count} matches`);
  
  // Update report status
  const { error: updateError } = await supabase
    .from("reports")
    .update({ status: "sent" })
    .eq("id", report.id);
    
  if (updateError) {
    console.error("Error updating report status:", updateError);
    throw updateError;
  }
  
  console.log("Updated report status to 'sent'");
  
  // Send confirmation to admin only - client emails will be sent manually for more personalized approach
  const adminEmailResult = await sendEmail(
    "jamie@lintels.in", 
    `[Lintels] Report Marked as Reviewed - ${contact.company} - ${contact.full_name}`,
    `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #2196F3; border-radius: 5px;">
      <h1 style="color: #2196F3; text-align: center;">Report Marked as Reviewed</h1>
      
      <p>The report for <strong>${contact.full_name}</strong> from <strong>${contact.company}</strong> has been marked as reviewed.</p>
      
      <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 15px 0;">
        <h3 style="margin-top: 0;">User Details:</h3>
        <ul>
          <li>Full Name: ${contact.full_name}</li>
          <li>Position: ${contact.position}</li>
          <li>Company: ${contact.company}</li>
          <li>Email: ${contact.email}</li>
          <li>Phone: ${contact.phone}</li>
        </ul>
        
        <h3>Report Details:</h3>
        <ul>
          <li>Properties analyzed: ${report.properties_count}</li>
          <li>Matches found: ${report.matches_count}</li>
        </ul>
      </div>
      
      <p><strong>Next Steps:</strong> You can now download the report from the Admin Dashboard and send it to the client manually with a personalized email.</p>
      
      <p style="text-align: center; font-size: 12px; color: #666; margin-top: 20px;">
        This is an automated message from lintels.in
      </p>
    </div>
    `
  );
  
  console.log("Admin confirmation email result:", adminEmailResult);
  
  return new Response(
    JSON.stringify({
      message: "Report marked as reviewed",
      contact_id: contact.id,
      report_id: report.id,
      status: "sent"
    }),
    { 
      headers: { 
        ...corsHeaders,
        "Content-Type": "application/json" 
      } 
    }
  );
}
