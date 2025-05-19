
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Setup function called");
    
    // Create a Supabase client with the service role key
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Missing Supabase credentials");
      throw new Error("Server configuration error: Supabase credentials missing");
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    console.log("Supabase client initialized");

    // Create pending-uploads bucket if it doesn't exist
    try {
      console.log("Attempting to create pending-uploads bucket");
      const { data: pendingBucket, error: pendingBucketError } = await supabase.storage.createBucket("pending-uploads", {
        public: false,
        allowedMimeTypes: ["text/csv", "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
        fileSizeLimit: 5242880, // 5MB
      });

      if (pendingBucketError && !pendingBucketError.message.includes("already exists")) {
        console.error("Error creating pending-uploads bucket:", pendingBucketError);
        throw pendingBucketError;
      } else {
        console.log("pending-uploads bucket created or already exists");
      }
    } catch (bucketError) {
      console.error("Exception creating pending-uploads bucket:", bucketError);
      throw bucketError;
    }

    // Create approved-uploads bucket if it doesn't exist
    try {
      console.log("Attempting to create approved-uploads bucket");
      const { data: approvedBucket, error: approvedBucketError } = await supabase.storage.createBucket("approved-uploads", {
        public: false,
        allowedMimeTypes: ["text/csv", "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
        fileSizeLimit: 5242880, // 5MB
      });

      if (approvedBucketError && !approvedBucketError.message.includes("already exists")) {
        console.error("Error creating approved-uploads bucket:", approvedBucketError);
        throw approvedBucketError;
      } else {
        console.log("approved-uploads bucket created or already exists");
      }
    } catch (bucketError) {
      console.error("Exception creating approved-uploads bucket:", bucketError);
      throw bucketError;
    }

    // Setup complete - return success
    return new Response(
      JSON.stringify({
        message: "Setup complete!",
        buckets: ["pending-uploads", "approved-uploads"],
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  } catch (error) {
    console.error("Setup function error:", error);
    return new Response(
      JSON.stringify({
        error: error.message || "Unknown error during setup",
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
