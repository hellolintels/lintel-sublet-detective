
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { sendEmail } from "../email.ts";
import { corsHeaders } from "../constants.ts";

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
  
  // Send email with report link to client
  await sendEmail(
    contact.email, 
    "Your Lintels Sample Report is Ready",
    `
    <div>
      <h1>Your Sample Report is Ready</h1>
      <p>Hello ${contact.full_name},</p>
      <p>Thank you for submitting your addresses to Lintels. We have analyzed your property data and found:</p>
      <ul>
        <li>${report.properties_count} properties analyzed</li>
        <li>${report.matches_count} potential short-term rental matches found</li>
      </ul>
      <p>This sample report demonstrates the capabilities of our full service.</p>
      <p>For the full report and detailed analysis of all your properties, please contact us at <a href="mailto:info@lintels.in">info@lintels.in</a>.</p>
    </div>
    `
  );
  
  // Send confirmation to admin
  await sendEmail(
    "jamie@lintels.in", 
    `[Lintels] Report Sent to ${contact.full_name}`,
    `
    <div>
      <h1>Report Sent Successfully</h1>
      <p>The sample report for ${contact.full_name} (${contact.email}) has been sent.</p>
      <p>Report details:</p>
      <ul>
        <li>Properties analyzed: ${report.properties_count}</li>
        <li>Matches found: ${report.matches_count}</li>
      </ul>
    </div>
    `
  );
  
  return new Response(
    JSON.stringify({
      message: "Report sent successfully",
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
