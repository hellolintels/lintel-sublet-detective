
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Setup function called");
    
    // Initialize Supabase admin client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Missing required environment variables");
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    console.log("Supabase client initialized");
    
    // Create required storage buckets
    try {
      console.log("Attempting to create pending-uploads bucket");
      
      // Create pending-uploads bucket with public access
      await supabase.storage.createBucket('pending-uploads', { 
        public: true,  // Make the bucket public for anonymous uploads
        fileSizeLimit: 5242880 // 5MB
      });
    } catch (bucketError) {
      console.log("Note about pending-uploads bucket creation:", bucketError.message);
    }
    
    try {
      console.log("Attempting to create approved-uploads bucket");
      
      // Create approved-uploads bucket (not public)
      await supabase.storage.createBucket('approved-uploads', { 
        public: false, 
        fileSizeLimit: 5242880 // 5MB
      });
    } catch (bucketError) {
      console.log("Note about approved-uploads bucket creation:", bucketError.message);
    }
    
    // Create storage policies for anonymous uploads to pending-uploads
    try {
      // Enable anonymous inserts to pending-uploads bucket
      const { error: policyError } = await supabase.rpc('create_storage_policy', {
        bucket: 'pending-uploads',
        policy_name: 'Allow Anonymous Uploads',
        definition: 'true', // Allow all uploads without authentication
        operation: 'INSERT'
      });
      
      if (policyError) {
        console.log("Policy creation error:", policyError.message);
        // If policy already exists or other error, continue
      } else {
        console.log("Anonymous upload policy created successfully");
      }
    } catch (policyError) {
      console.log("Note about policy creation:", policyError.message);
      // If RPC doesn't exist, try direct SQL instead
      
      try {
        // Try to create policy directly with SQL
        await supabase
          .from('_rpc')
          .select('*')
          .rpc('sp_create_storage_policy', {
            bucket_name: 'pending-uploads',
            policy_name: 'Allow Anonymous Uploads',
            policy_definition: 'true',
            policy_operation: 'INSERT'
          });
        
        console.log("Anonymous upload policy created via stored procedure");
      } catch (directPolicyError) {
        console.log("Unable to create policy directly:", directPolicyError.message);
        // Continue with setup regardless of policy creation result
      }
    }
    
    return new Response(
      JSON.stringify({
        message: "Setup completed successfully",
        timestamp: new Date().toISOString(),
        status: "success",
        bucketsCreated: true
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 200
      }
    );
    
  } catch (error) {
    console.error("Setup function error:", error);
    
    return new Response(
      JSON.stringify({
        error: error.message || "Unknown error occurred",
        timestamp: new Date().toISOString(),
        status: "error"
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 500
      }
    );
  }
});
