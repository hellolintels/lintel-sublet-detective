
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { corsHeaders } from "./constants.ts";
import { handleInitialProcess } from "./handlers/initial-process.ts";
import { handleApproveProcessing } from "./handlers/approve-processing.ts";
import { handleSendResults } from "./handlers/send-results.ts";

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    // Extract the request parameters - handle both JSON body and URL parameters
    let contactId, action = "initial_process", reportId;
    const url = new URL(req.url);
    
    // Check if this is a GET request (direct link from email)
    if (req.method === "GET") {
      contactId = url.searchParams.get("contact_id");
      action = url.searchParams.get("action") || "initial_process";
      reportId = url.searchParams.get("report_id");
      
      console.log("Processing GET request with params:", { contactId, action, reportId });
    } else {
      // Handle POST request with JSON body
      try {
        const requestData = await req.json();
        contactId = requestData.contactId;
        action = requestData.action || "initial_process";
        reportId = requestData.reportId;
        
        console.log("Processing POST request with data:", requestData);
      } catch (parseError) {
        console.error("Error parsing request JSON:", parseError);
        throw new Error("Invalid JSON in request body");
      }
    }
    
    // Create a Supabase client with the service role key
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing environment variables for Supabase connection");
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    console.log("Created Supabase client with service role");
    
    // Validate contactId for all actions except initial_process which might be coming from form
    if (!contactId && action !== "initial_process") {
      console.error("Contact ID is required but was not provided for action:", action);
      throw new Error("Contact ID is required for action: " + action);
    }
    
    console.log(`Processing request with action: ${action}` + (contactId ? ` for contact ID: ${contactId}` : ""));
    
    // Different actions based on the request type
    switch (action) {
      case "initial_process":
        if (!contactId) {
          console.error("Contact ID is required for initial_process action");
          throw new Error("Contact ID is required");
        }
        
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
        return await handleInitialProcess(supabase, contact, supabaseUrl);
      
      case "approve_processing":
        if (!contactId) {
          console.error("Contact ID is required for approve_processing action");
          throw new Error("Contact ID is required");
        }
        
        // Get the contact data
        const { data: approveContact, error: approveContactError } = await supabase
          .from("contacts")
          .select("*")
          .eq("id", contactId)
          .single();
          
        if (approveContactError) {
          console.error("Error fetching contact for approval:", approveContactError);
          throw approveContactError;
        }
        
        if (!approveContact) {
          throw new Error(`Contact with ID ${contactId} not found for approval`);
        }
        
        // Update contact status to approved
        const { error: updateError } = await supabase
          .from("contacts")
          .update({ status: "approved" })
          .eq("id", contactId);
          
        if (updateError) {
          console.error("Error updating contact status:", updateError);
          throw updateError;
        }
        
        console.log(`Contact status updated to "approved" for ID: ${contactId}`);
        console.log(`Found contact for approval: ${approveContact.full_name}`);
        
        // HTML content for approval confirmation
        const approvalHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Address List Processing Approved</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              margin: 40px;
              line-height: 1.6;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
              border: 1px solid #e1e1e1;
              border-radius: 5px;
            }
            .header {
              background-color: #4CAF50;
              color: white;
              padding: 10px 20px;
              border-radius: 5px 5px 0 0;
              margin-top: 0;
            }
            .content {
              padding: 20px;
            }
            .footer {
              text-align: center;
              margin-top: 20px;
              font-size: 12px;
              color: #666;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1 class="header">Address List Processing Approved</h1>
            <div class="content">
              <p>You have successfully approved the address list submission from <strong>${approveContact.full_name}</strong> (${approveContact.email}).</p>
              <p>The system will now process the address list through BrightData and generate a sample report.</p>
              <p>Once processing is complete, you will receive another notification.</p>
              <p>Contact ID: ${contactId}</p>
            </div>
            <div class="footer">
              <p>Lintels Address List Processing System</p>
            </div>
          </div>
        </body>
        </html>
        `;
        
        // Process the approved contact
        // This will call the handleApproveProcessing function to start the BrightData processing
        await handleApproveProcessing(supabase, approveContact, reportId, supabaseUrl);
        
        // Return HTML response when accessed via browser link
        return new Response(approvalHtml, {
          status: 200,
          headers: {
            ...corsHeaders,
            "Content-Type": "text/html"
          }
        });
      
      case "reject_processing":
        if (!contactId) {
          console.error("Contact ID is required for reject_processing action");
          throw new Error("Contact ID is required");
        }
        
        // Get the contact data
        const { data: rejectContact, error: rejectContactError } = await supabase
          .from("contacts")
          .select("*")
          .eq("id", contactId)
          .single();
          
        if (rejectContactError) {
          console.error("Error fetching contact for rejection:", rejectContactError);
          throw rejectContactError;
        }
        
        if (!rejectContact) {
          throw new Error(`Contact with ID ${contactId} not found for rejection`);
        }
        
        // Update contact status to rejected
        const { error: rejectUpdateError } = await supabase
          .from("contacts")
          .update({ status: "rejected" })
          .eq("id", contactId);
          
        if (rejectUpdateError) {
          console.error("Error updating contact status:", rejectUpdateError);
          throw rejectUpdateError;
        }
        
        console.log(`Contact status updated to "rejected" for ID: ${contactId}`);
        console.log(`Rejected contact: ${rejectContact.full_name}`);
        
        // HTML content for rejection confirmation
        const rejectionHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Address List Processing Rejected</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              margin: 40px;
              line-height: 1.6;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
              border: 1px solid #e1e1e1;
              border-radius: 5px;
            }
            .header {
              background-color: #f44336;
              color: white;
              padding: 10px 20px;
              border-radius: 5px 5px 0 0;
              margin-top: 0;
            }
            .content {
              padding: 20px;
            }
            .footer {
              text-align: center;
              margin-top: 20px;
              font-size: 12px;
              color: #666;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1 class="header">Address List Processing Rejected</h1>
            <div class="content">
              <p>You have rejected the address list submission from <strong>${rejectContact.full_name}</strong> (${rejectContact.email}).</p>
              <p>No further processing will be done with this submission.</p>
              <p>Contact ID: ${contactId}</p>
            </div>
            <div class="footer">
              <p>Lintels Address List Processing System</p>
            </div>
          </div>
        </body>
        </html>
        `;
        
        // Return HTML response when accessed via browser link
        return new Response(rejectionHtml, {
          status: 200,
          headers: {
            ...corsHeaders,
            "Content-Type": "text/html"
          }
        });
      
      case "send_results":
        if (!contactId) {
          console.error("Contact ID is required for send_results action");
          throw new Error("Contact ID is required");
        }
        
        // Get the contact data
        const { data: resultsContact, error: resultsContactError } = await supabase
          .from("contacts")
          .select("*")
          .eq("id", contactId)
          .single();
          
        if (resultsContactError) {
          console.error("Error fetching contact for results:", resultsContactError);
          throw resultsContactError;
        }
        
        if (!resultsContact) {
          throw new Error(`Contact with ID ${contactId} not found for results`);
        }
        
        console.log(`Found contact for results: ${resultsContact.full_name}`);
        return await handleSendResults(supabase, resultsContact, reportId);
      
      default:
        throw new Error(`Unknown action: ${action}`);
    }
    
  } catch (error) {
    console.error("Error in process-addresses function:", error);
    
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : String(error),
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
