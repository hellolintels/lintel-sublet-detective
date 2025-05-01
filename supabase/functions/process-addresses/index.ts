
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.37.0";

const supabaseUrl = Deno.env.get("SUPABASE_URL") as string;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") as string;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { contactId, emails, reportId, action } = await req.json();
    
    console.log(`Processing request: contactId=${contactId}, action=${action || "process"}, emails=${emails?.join(",")}`);
    
    // If this is a send results action
    if (action === "send_results" && reportId) {
      console.log(`Sending results for report ${reportId} to ${emails?.join(",")}`);
      
      // Get the report data
      const { data: report, error: reportError } = await supabase
        .from("reports")
        .select("*")
        .eq("id", reportId)
        .single();
        
      if (reportError) {
        throw new Error(`Error fetching report: ${reportError.message}`);
      }
      
      // Get contact data
      const { data: contact, error: contactError } = await supabase
        .from("contacts")
        .select("*")
        .eq("id", contactId)
        .single();
        
      if (contactError) {
        throw new Error(`Error fetching contact: ${contactError.message}`);
      }
      
      // In a real implementation, you would send an email with the report results here
      console.log(`Would send email to ${emails?.join(",")} with report results`);
      
      // For now, we'll simulate sending by updating the status
      await supabase
        .from("reports")
        .update({ status: "sent" })
        .eq("id", reportId);
        
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `Results sent to ${emails?.join(", ")}`
        }),
        { 
          headers: { 
            "Content-Type": "application/json",
            ...corsHeaders 
          } 
        }
      );
    }
    
    // Process a contact request
    if (!contactId) {
      throw new Error("Missing contactId parameter");
    }
    
    // Get the contact data
    const { data: contact, error: contactError } = await supabase
      .from("contacts")
      .select("*")
      .eq("id", contactId)
      .single();
      
    if (contactError) {
      throw new Error(`Error fetching contact: ${contactError.message}`);
    }
    
    console.log(`Processing contact: ${contact.full_name}, file: ${contact.file_name}`);
    
    // Simulate processing: In a real implementation, 
    // you would process the file data and generate a report
    
    // For demonstration, we'll create a mock report
    const properties = Math.floor(Math.random() * 20) + 5; // Random number between 5-24
    const matches = Math.floor(Math.random() * properties);
    
    // Create a report entry
    const { data: report, error: reportError } = await supabase
      .from("reports")
      .insert({
        contact_id: contactId,
        properties_count: properties,
        matches_count: matches,
        html_content: `<h1>Report for ${contact.full_name}</h1><p>We found ${matches} matches out of ${properties} properties.</p>`,
        status: "processed"
      })
      .select()
      .single();
      
    if (reportError) {
      throw new Error(`Error creating report: ${reportError.message}`);
    }
    
    // Update contact status
    await supabase
      .from("contacts")
      .update({ status: "processed" })
      .eq("id", contactId);
      
    // In a real implementation, you would send an email to the admin here
    console.log(`Would send email to admin that report ${report.id} is ready for review`);
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Processed contact ${contactId}`,
        report: report
      }),
      { 
        headers: { 
          "Content-Type": "application/json",
          ...corsHeaders 
        } 
      }
    );
  } catch (error) {
    console.error("Error processing addresses:", error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 500,
        headers: { 
          "Content-Type": "application/json",
          ...corsHeaders 
        } 
      }
    );
  }
});
