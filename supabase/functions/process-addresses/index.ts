
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
    const { contactId } = await req.json();
    
    if (!contactId) {
      throw new Error("Contact ID is required");
    }
    
    console.log(`Processing address data for contact ID: ${contactId}`);
    
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
    
    // Process address data (simplified for now)
    // In a real implementation, this would analyze the CSV/Excel data
    
    // Update contact status
    const { error: updateError } = await supabase
      .from("contacts")
      .update({ status: "processing" })
      .eq("id", contactId);
      
    if (updateError) {
      console.error("Error updating contact status:", updateError);
      throw updateError;
    }
    
    console.log(`Updated contact status to 'processing'`);
    
    // Create a sample report
    const reportData = {
      contact_id: contactId,
      html_content: `<div>Sample report for ${contact.full_name}</div>`,
      properties_count: Math.floor(Math.random() * 50) + 10,
      matches_count: Math.floor(Math.random() * 20),
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
    
    console.log(`Created report with ID: ${report[0]?.id || 'unknown'}`);
    
    return new Response(
      JSON.stringify({
        message: "Address processing started successfully",
        contact_id: contactId,
        report_id: report[0]?.id,
      }),
      { 
        headers: { 
          ...corsHeaders,
          "Content-Type": "application/json" 
        } 
      }
    );
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
