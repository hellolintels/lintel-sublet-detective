
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { handleCors, corsHeaders } from '../_shared/cors.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { createLogger } from '../_shared/debug-logger.ts';
import { sendEmail, buildAdminNotificationEmail, buildClientConfirmationEmail } from '../_shared/email.ts';

const logger = createLogger({ module: 'submit-form' });

// Initialize supabase client
function getSupabaseClient() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing database credentials");
  }
  
  return createClient(supabaseUrl, supabaseKey);
}

// Create submission record in database
async function createSubmission(requestData: any): Promise<string> {
  try {
    console.log("Recording submission for:", requestData.full_name);
    
    const supabase = getSupabaseClient();
    
    const submissionData = {
      full_name: requestData.full_name,
      email: requestData.email,
      company: requestData.company || '',
      position: requestData.position || '',
      phone: requestData.phone || '',
      storage_path: requestData.storagePath,
      status: 'pending',
      updated_at: new Date().toISOString(),
    };
    
    const { data, error } = await supabase
      .from('pending_submissions')
      .insert(submissionData)
      .select('id')
      .single();
      
    if (error) {
      console.error("Error recording submission:", error);
      throw new Error(`Database error: ${error.message}`);
    }
    
    if (!data || !data.id) {
      throw new Error("No submission ID returned");
    }
    
    console.log("Submission recorded successfully with ID:", data.id);
    return data.id;
  } catch (error) {
    console.error("Error in createSubmission:", error);
    throw error;
  }
}

// Verify file exists in storage
async function verifyFileExists(storagePath: string): Promise<boolean> {
  try {
    const supabase = getSupabaseClient();
    
    // Extract bucket and file path from storagePath 
    // Format is typically "bucket_name/path/to/file.ext"
    const pathParts = storagePath.split('/');
    const bucketName = pathParts[0] || 'pending-uploads';
    const filePath = pathParts.slice(1).join('/');
    
    const { data, error } = await supabase
      .storage
      .from(bucketName)
      .download(filePath);
      
    if (error) {
      logger.warn("File verification failed:", { error });
      return false;
    }
    
    return data !== null;
  } catch (error) {
    logger.warn("File verification error:", { error });
    return false;
  }
}

// Process form submission and notify administrators
serve(async (req) => {
  try {
    // Handle CORS preflight
    const corsResponse = handleCors(req);
    if (corsResponse) return corsResponse;
    
    logger.info("📝 Form submission request received");
    
    // Parse request data
    const requestData = await req.json();
    
    logger.debug("Form data received", {
      name: requestData.full_name,
      email: requestData.email,
      company: requestData.company,
      formType: requestData.form_type
    });
    
    // Validate submission
    if (!requestData.full_name || !requestData.email || !requestData.storagePath) {
      logger.warn("Submission validation failed", { requestData });
      return new Response(
        JSON.stringify({
          success: false,
          error: "Missing required fields"
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Store submission in database
    const submissionId = await createSubmission(requestData);
    logger.info(`Created submission with ID ${submissionId}`);
    
    // Try to verify the file exists
    const fileExists = await verifyFileExists(requestData.storagePath);
    if (fileExists) {
      logger.info("Verified file exists");
    } else {
      logger.warn("File verification failed - continuing anyway");
      // Continue even if file verification fails - admin review will catch issues
    }
    
    // Get admin email from env
    const adminEmail = Deno.env.get("APPROVER_EMAIL") || "jamie@lintels.in";
    
    // Prepare admin notification email
    const adminHtml = buildAdminNotificationEmail({
      ...requestData,
      id: submissionId
    });
    
    // Send admin notification
    const adminEmailResult = await sendEmail(
      adminEmail,
      `New Request: ${requestData.full_name} from ${requestData.company || 'Unknown'}`,
      adminHtml
    );
    
    // Prepare client confirmation email
    const clientHtml = buildClientConfirmationEmail(requestData);
    
    // Send client confirmation
    const clientEmailResult = await sendEmail(
      requestData.email,
      "Thank you for your submission to Lintels.in",
      clientHtml
    );
    
    logger.info("Email notification sent to admin", { success: adminEmailResult.success });
    logger.info("Confirmation email sent to client", { success: clientEmailResult.success });
    
    // Return success with result details
    return new Response(
      JSON.stringify({
        success: true,
        submissionId,
        emailSent: adminEmailResult.success && clientEmailResult.success
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    logger.error("❌ ERROR in submit-form function", { error: error.message });
    
    // Return error response
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "An unknown error occurred"
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
