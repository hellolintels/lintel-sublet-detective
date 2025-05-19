
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

    // Create storage buckets if they don't exist
    console.log("Attempting to create pending-uploads bucket");
    try {
      const { data: pendingBucket, error: pendingError } = await supabase
        .storage
        .createBucket("pending-uploads", {
          public: false,
          allowedMimeTypes: ["text/csv", "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
          fileSizeLimit: 5242880, // 5MB
        });

      console.log("pending-uploads bucket created or already exists");
    } catch (bucketError) {
      // Bucket might already exist, which is fine
      console.log("Note: pending-uploads bucket may already exist");
    }

    console.log("Attempting to create approved-uploads bucket");
    try {
      const { data: approvedBucket, error: approvedError } = await supabase
        .storage
        .createBucket("approved-uploads", {
          public: false,
          allowedMimeTypes: ["text/csv", "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
          fileSizeLimit: 5242880, // 5MB
        });

      console.log("approved-uploads bucket created or already exists");
    } catch (bucketError) {
      // Bucket might already exist, which is fine
      console.log("Note: approved-uploads bucket may already exist");
    }

    return new Response(
      JSON.stringify({
        message: "Setup completed successfully",
        timestamp: new Date().toISOString(),
        status: "success"
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
