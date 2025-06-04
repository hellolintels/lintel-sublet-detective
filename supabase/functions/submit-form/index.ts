
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { handleCors, corsHeaders } from '../_shared/cors.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { createLogger } from '../_shared/debug-logger.ts';
import { sendEmail, buildAdminNotificationEmail, buildClientConfirmationEmail } from '../_shared/email.ts';
import { countRows, extractPostcodes, MAX_ROWS } from '../_shared/file-processing.ts';
import { downloadFileContent, moveFileToApprovedBucket } from '../_shared/storage.ts';

const logger = createLogger({ module: 'submit-form' });
const CHUNK_SIZE = 15; // Process 15 postcodes per chunk

// Job management utilities (moved from job-manager.ts)
async function createProcessingJob(contactId: string, postcodes: any[]) {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing Supabase credentials");
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  const totalChunks = Math.ceil(postcodes.length / CHUNK_SIZE);
  
  const { data, error } = await supabase
    .from('processing_jobs')
    .insert({
      contact_id: contactId,
      total_postcodes: postcodes.length,
      total_chunks: totalChunks,
      postcodes: postcodes,
      status: 'pending'
    })
    .select('id')
    .single();
    
  if (error) {
    throw new Error(`Failed to create processing job: ${error.message}`);
  }
  
  console.log(`📋 Created processing job ${data.id} for ${postcodes.length} postcodes (${totalChunks} chunks)`);
  return data.id;
}

async function triggerNextChunk(jobId?: string) {
  try {
    const response = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/auto-process-batch`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ jobId })
    });
    
    if (!response.ok) {
      throw new Error(`Failed to trigger processing: ${response.statusText}`);
    }
    
    const result = await response.json();
    console.log(`✅ Triggered next chunk processing:`, result);
    
    // If not completed, schedule next chunk
    if (result.success && !result.completed) {
      // Delay next chunk to prevent overwhelming the system
      setTimeout(() => triggerNextChunk(jobId), 30000); // 30 second delay
    }
    
    return result;
  } catch (error) {
    console.error('❌ Error triggering next chunk:', error);
    throw error;
  }
}

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
      organization_type: requestData.organization_type || null,
      organization_other: requestData.organization_other || null,
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

// Auto-approve and process files that meet criteria
async function autoProcessIfEligible(submissionId: string, requestData: any): Promise<boolean> {
  try {
    const supabase = getSupabaseClient();
    
    // Download file content for analysis
    const fileContent = await downloadFileContent("pending-uploads", requestData.storagePath);
    const rowCount = countRows(fileContent);
    
    console.log(`📊 File analysis: ${rowCount} rows (max allowed: ${MAX_ROWS})`);
    
    // Only auto-process files within row limits
    if (rowCount > MAX_ROWS) {
      console.log(`❌ File exceeds limit (${rowCount} > ${MAX_ROWS}), requiring manual approval`);
      return false;
    }
    
    // Extract postcodes for processing
    const postcodes = extractPostcodes(fileContent);
    
    if (postcodes.length === 0) {
      console.log(`❌ No valid postcodes found, requiring manual review`);
      return false;
    }
    
    console.log(`✅ Auto-processing eligible: ${postcodes.length} postcodes extracted`);
    
    // Move file to approved bucket
    const approvedPath = await moveFileToApprovedBucket(requestData.storagePath, submissionId);
    
    // Create contact record
    const contactData = {
      full_name: requestData.full_name,
      email: requestData.email,
      company: requestData.company || '',
      position: requestData.position || '',
      phone: requestData.phone || '',
      organization_type: requestData.organization_type || null,
      organization_other: requestData.organization_other || null,
      approved_file_path: approvedPath,
      status: "scraping",
      processing_status: "scraping",
      form_type: "sample"
    };
    
    const { data: contact, error: contactError } = await supabase
      .from('contacts')
      .insert(contactData)
      .select('id')
      .single();
      
    if (contactError) {
      throw new Error(`Error creating contact: ${contactError.message}`);
    }
    
    // Update submission status
    await supabase
      .from('pending_submissions')
      .update({ status: 'auto_approved' })
      .eq('id', submissionId);
    
    // Create and start processing job
    const jobId = await createProcessingJob(contact.id, postcodes);
    
    // Send client notification about auto-processing
    await sendEmail(
      requestData.email,
      "Your Property Report is Being Processed - Lintels.in",
      `
      <p>Hello ${requestData.full_name},</p>
      <p>Great news! Your property matching report has been automatically approved and is now being processed.</p>
      <p><strong>Processing Details:</strong></p>
      <ul>
        <li>Total Addresses: ${postcodes.length}</li>
        <li>Expected Completion: Within 24 hours</li>
        <li>Job ID: ${jobId}</li>
      </ul>
      <p>Our automated system will check Airbnb, SpareRoom, and Gumtree for matching properties. You will receive an email with your complete report once processing is finished.</p>
      <p>Thank you for choosing Lintels.in!</p>
      <p>Best regards,<br>The Lintels Team</p>
      `
    );
    
    // Start processing immediately
    await triggerNextChunk(jobId);
    
    console.log(`🚀 Auto-processing started for ${requestData.full_name} (Job ID: ${jobId})`);
    return true;
    
  } catch (error) {
    console.error('❌ Auto-processing failed:', error);
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
    }
    
    // Attempt auto-processing for eligible files
    const autoProcessed = await autoProcessIfEligible(submissionId, requestData);
    
    if (autoProcessed) {
      logger.info("File auto-processed successfully");
      
      return new Response(
        JSON.stringify({
          success: true,
          submissionId,
          autoProcessed: true,
          message: "Your file has been automatically approved and processing has started. You will receive your report within 24 hours."
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // If not auto-processed, send traditional admin notification
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
        emailSent: adminEmailResult.success && clientEmailResult.success,
        autoProcessed: false,
        message: "Your submission is under review. You will be notified once approved."
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
