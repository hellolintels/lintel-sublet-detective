
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Simple email sending function
async function sendEmail(to: string, subject: string, htmlContent: string) {
  try {
    // For MVP, we'll use a simple email service - this would be replaced with a proper email service
    console.log(`SENDING EMAIL TO: ${to}`);
    console.log(`SUBJECT: ${subject}`);
    console.log(`CONTENT: ${htmlContent}`);
    
    // In a real implementation, this would call an email API like SendGrid, Mailgun, or AWS SES
    // For now, we'll just log it as this is an MVP
    return { success: true };
  } catch (error) {
    console.error("Error sending email:", error);
    return { success: false, error };
  }
}

// Count rows in a CSV-like string
function countAddressRows(fileData: string): number {
  if (!fileData) return 0;
  // Convert base64 to string if it's base64 encoded
  let dataString;
  try {
    dataString = atob(fileData);
  } catch (e) {
    dataString = fileData;
  }
  
  // Count lines, excluding header
  const lines = dataString.split('\n');
  return Math.max(0, lines.length - 1); // Subtract 1 for header
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    // Create a Supabase client with the service role key
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing environment variables for Supabase connection");
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    console.log("Created Supabase client with service role");
    
    // Parse the request body
    const requestData = await req.json();
    const { contactId, action = "initial_process", reportId } = requestData;
    
    if (!contactId) {
      throw new Error("Contact ID is required");
    }
    
    console.log(`Processing request with action: ${action} for contact ID: ${contactId}`);
    
    // Get the contact data
    const { data: contact, error: contactError } = await supabase
      .from("contacts")
      .select("*")
      .eq("id", contactId)
      .single();
      
    if (contactError) {
      console.error("Error fetching contact:", contactError);
      throw contactError;
    }
    
    if (!contact) {
      throw new Error(`Contact with ID ${contactId} not found`);
    }
    
    console.log(`Found contact: ${contact.full_name}`);
    
    // Different actions based on the request type
    switch (action) {
      case "initial_process":
        return await handleInitialProcess(supabase, contact);
      
      case "approve_processing":
        return await handleApproveProcessing(supabase, contact, reportId);
      
      case "send_results":
        return await handleSendResults(supabase, contact, reportId);
      
      default:
        throw new Error(`Unknown action: ${action}`);
    }
    
  } catch (error) {
    console.error("Error in process-addresses function:", error);
    
    return new Response(
      JSON.stringify({
        error: error.message || "An unexpected error occurred",
      }),
      {
        status: 400,
        headers: { 
          ...corsHeaders,
          "Content-Type": "application/json" 
        },
      }
    );
  }
});

async function handleInitialProcess(supabase, contact) {
  // Check if the address file has too many rows
  if (contact.file_data) {
    const rowCount = countAddressRows(contact.file_data);
    console.log(`Address file contains ${rowCount} rows`);
    
    if (rowCount > 20) {
      // Update status to indicate too many addresses
      await supabase
        .from("contacts")
        .update({ status: "too_many_addresses" })
        .eq("id", contact.id);
        
      // Send notification about too many addresses
      await sendEmail(
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
      
      return new Response(
        JSON.stringify({
          message: "Address file contains too many rows (limit: 20)",
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
  }
  
  // Set contact status to pending approval
  const { error: updateError } = await supabase
    .from("contacts")
    .update({ status: "pending_approval" })
    .eq("id", contact.id);
    
  if (updateError) {
    console.error("Error updating contact status:", updateError);
    throw updateError;
  }
  
  console.log(`Updated contact status to 'pending_approval'`);
  
  // Send approval request email to admin (jamie@lintels.in)
  const approvalUrl = `${Deno.env.get("SUPABASE_URL") || ""}/functions/v1/process-addresses`;
  
  await sendEmail(
    "jamie@lintels.in", 
    `[Lintels] New Address Request from ${contact.full_name}`,
    `
    <div>
      <h1>New Address Processing Request</h1>
      <p>A new submission has been received from ${contact.full_name} (${contact.email}) at ${contact.company}.</p>
      <p>The file contains addresses that need to be processed.</p>
      <p>To approve this request, please click the link below:</p>
      <p><a href="${approvalUrl}?action=approve_processing&contact_id=${contact.id}">Approve Processing</a></p>
    </div>
    `
  );
  
  return new Response(
    JSON.stringify({
      message: "Address data submitted for approval",
      contact_id: contact.id,
      status: "pending_approval"
    }),
    { 
      headers: { 
        ...corsHeaders,
        "Content-Type": "application/json" 
      } 
    }
  );
}

async function handleApproveProcessing(supabase, contact, reportId) {
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
  
  // Send notification that processing is complete to jamie@lintels.in
  const viewReportUrl = `${Deno.env.get("SUPABASE_URL") || ""}/functions/v1/process-addresses?action=send_results&contact_id=${contact.id}&report_id=${newReportId}`;
  
  await sendEmail(
    "jamie@lintels.in", 
    `[Lintels] Address Processing Complete for ${contact.full_name}`,
    `
    <div>
      <h1>Address Processing Complete</h1>
      <p>The address processing for ${contact.full_name} (${contact.email}) is now complete.</p>
      <p>Report details:</p>
      <ul>
        <li>Properties analyzed: ${reportData.properties_count}</li>
        <li>Matches found: ${reportData.matches_count}</li>
      </ul>
      <p>To send this report to the client, please click the link below:</p>
      <p><a href="${viewReportUrl}">Send Report to Client</a></p>
    </div>
    `
  );
  
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

async function handleSendResults(supabase, contact, reportId) {
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
