
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
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Parse the request body
    const { contactId } = await req.json();
    
    if (!contactId) {
      throw new Error("Contact ID is required");
    }
    
    // Get the contact data
    const { data: contact, error: contactError } = await supabase
      .from("contacts")
      .select("*")
      .eq("id", contactId)
      .single();
      
    if (contactError) {
      throw contactError;
    }
    
    // Process address data (simplified for now)
    // In a real implementation, this would analyze the CSV/Excel data
    
    // Update contact status
    const { error: updateError } = await supabase
      .from("contacts")
      .update({ status: "processing" })
      .eq("id", contactId);
      
    if (updateError) {
      throw updateError;
    }
    
    // Create a sample report
    const { error: reportError } = await supabase
      .from("reports")
      .insert({
        contact_id: contactId,
        html_content: `<div>Sample report for ${contact.full_name}</div>`,
        properties_count: Math.floor(Math.random() * 50) + 10,
        matches_count: Math.floor(Math.random() * 20),
      });
      
    if (reportError) {
      throw reportError;
    }
    
    return new Response(
      JSON.stringify({
        message: "Address processing started successfully",
        contact_id: contactId,
      }),
      { 
        headers: { 
          ...corsHeaders,
          "Content-Type": "application/json" 
        } 
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error.message,
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
