
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    console.log("Setup function called");

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL") as string;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") as string;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    console.log("Supabase client initialized");

    // Create pending-uploads bucket if it doesn't exist
    console.log("Attempting to create pending-uploads bucket");
    try {
      const { error: pendingError } = await supabase
        .storage
        .createBucket("pending-uploads", {
          public: false,
          allowedMimeTypes: ["text/csv", "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
          fileSizeLimit: 5242880, // 5MB
        });

      if (pendingError) {
        console.log("Note about pending-uploads bucket creation:", pendingError.message);
      } else {
        console.log("pending-uploads bucket created successfully");
      }
    } catch (bucketError) {
      console.log("Note: pending-uploads bucket may already exist");
    }

    // Create approved-uploads bucket if it doesn't exist
    console.log("Attempting to create approved-uploads bucket");
    try {
      const { error: approvedError } = await supabase
        .storage
        .createBucket("approved-uploads", {
          public: false,
          allowedMimeTypes: ["text/csv", "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
          fileSizeLimit: 5242880, // 5MB
        });

      if (approvedError) {
        console.log("Note about approved-uploads bucket creation:", approvedError.message);
      } else {
        console.log("approved-uploads bucket created successfully");
      }
    } catch (bucketError) {
      console.log("Note: approved-uploads bucket may already exist");
    }

    return new Response(
      JSON.stringify({
        message: "Setup completed successfully",
        timestamp: new Date().toISOString(),
        status: "success",
        bucketsCreated: true
      }),
      { 
        headers: { "Content-Type": "application/json", ...corsHeaders },
        status: 200
      }
    );
  } catch (error) {
    console.error("Error in setup function:", error);
    
    return new Response(
      JSON.stringify({
        error: error.message || "Unknown error",
        timestamp: new Date().toISOString(),
        status: "error"
      }),
      { 
        headers: { "Content-Type": "application/json", ...corsHeaders },
        status: 500
      }
    );
  }
});
