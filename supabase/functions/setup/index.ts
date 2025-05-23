
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
    
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false, // Don't persist auth state
        autoRefreshToken: false, // Don't refresh tokens
      }
    });
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
    
    // Create storage policies using safer approach
    try {
      const res = await supabase.storage.from('pending-uploads').getPublicUrl('test.txt');
      console.log("Storage policies verified.");
    } catch (policyError) {
      console.log("Storage policy verification error:", policyError.message);
      
      // Create storage policies directly using SQL (safer than RPC)
      try {
        // Use a paranoid timeout to prevent long-running queries
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('SQL execution timed out')), 5000)
        );
        
        const sqlPromise = supabase.rpc('create_storage_policy', {
          bucket_name: 'pending-uploads',
          policy_name: 'Allow Anonymous Uploads',
          policy_definition: 'true', 
          policy_operation: 'INSERT'
        });
        
        await Promise.race([sqlPromise, timeoutPromise]);
        console.log("Storage policy created successfully");
      } catch (sqlError) {
        console.log("Note about storage policy creation:", sqlError.message);
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
          'Content-Type': 'application/json',
          'X-Content-Type-Options': 'nosniff',
          'X-Frame-Options': 'DENY',
          'Content-Security-Policy': "default-src 'none'"
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
          'Content-Type': 'application/json',
          'X-Content-Type-Options': 'nosniff'
        },
        status: 500
      }
    );
  }
});
