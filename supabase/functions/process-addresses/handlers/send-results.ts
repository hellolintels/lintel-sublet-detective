
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
  
  // Send email with report link to client
  const clientEmailResult = await sendEmail(
    contact.email, 
    "Your Lintels Sample Report is Ready",
    `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #2196F3; border-radius: 5px;">
      <h1 style="color: #2196F3; text-align: center;">Your Sample Report is Ready</h1>
      
      <p>Hello ${contact.full_name},</p>
      
      <p>Thank you for submitting your addresses to Lintels. We have analyzed your property data and found:</p>
      
      <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 15px 0;">
        <ul>
          <li><strong>${report.properties_count}</strong> properties analyzed</li>
          <li><strong>${report.matches_count}</strong> potential short-term rental matches found</li>
        </ul>
      </div>
      
      <p>This sample report demonstrates the capabilities of our full service.</p>
      
      <p>For the full report and detailed analysis of all your properties, please contact us at <a href="mailto:info@lintels.in">info@lintels.in</a>.</p>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="https://lintels.in/contact" 
           style="background-color: #2196F3; color: white; padding: 12px 20px; text-decoration: none; font-weight: bold; border-radius: 5px; display: inline-block;">
          Get Full Analysis
        </a>
      </div>
      
      <p style="text-align: center; font-size: 12px; color: #666; margin-top: 20px;">
        This is an automated message from lintels.in
      </p>
    </div>
    `
  );
  
  console.log("Client email result:", clientEmailResult);
  
  // Send confirmation to admin
  const adminEmailResult = await sendEmail(
    "jamie@lintels.in", 
    `[Lintels] Report Sent to ${contact.full_name}`,
    `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #2196F3; border-radius: 5px;">
      <h1 style="color: #2196F3; text-align: center;">Report Sent Successfully</h1>
      
      <p>The sample report for <strong>${contact.full_name}</strong> has been sent.</p>
      
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
      
      <p style="text-align: center; font-size: 12px; color: #666; margin-top: 20px;">
        This is an automated message from lintels.in
      </p>
    </div>
    `
  );
  
  console.log("Admin confirmation email result:", adminEmailResult);
  
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
