
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
    
    // Check if this is a GET request (direct link from email)
    if (req.method === "GET") {
      const url = new URL(req.url);
      contactId = url.searchParams.get("contact_id");
      action = url.searchParams.get("action") || "initial_process";
      reportId = url.searchParams.get("report_id");
      
      console.log("Processing GET request with params:", { contactId, action, reportId });
    } else {
      // Handle POST request with JSON body
      const requestData = await req.json();
      contactId = requestData.contactId;
      action = requestData.action || "initial_process";
      reportId = requestData.reportId;
      
      console.log("Processing POST request with data:", requestData);
    }
    
    // Create a Supabase client with the service role key
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing environment variables for Supabase connection");
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    console.log("Created Supabase client with service role");
    
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
        return await handleInitialProcess(supabase, contact, supabaseUrl);
      
      case "approve_processing":
        return await handleApproveProcessing(supabase, contact, reportId, supabaseUrl);
      
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
