
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

serve(async (req) => {
  try {
    // Create a Supabase client with the service role key
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Create storage bucket for address lists if it doesn't exist
    const { error: bucketError } = await supabase.storage.createBucket("address-lists", {
      public: false,
      allowedMimeTypes: ["text/csv"],
      fileSizeLimit: 10485760, // 10MB
    });

    if (bucketError && !bucketError.message.includes("already exists")) {
      throw bucketError;
    }

    return new Response(
      JSON.stringify({
        message: "Setup complete!",
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error.message,
      }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});
