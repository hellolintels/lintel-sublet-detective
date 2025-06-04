
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { handleCors, corsHeaders } from '../_shared/cors.ts';
import { updateContactStatus } from '../_shared/db.ts';
import { getContactById } from './utils/contact-validator.ts';
import { downloadFileContent, extractPostcodes } from './utils/file-processor.ts';
import { createProcessingJob } from './utils/job-manager.ts';
import { callRailwayAPI } from './utils/railway-client.ts';
import { sendClientNotification, sendAdminNotification } from './utils/notification-service.ts';

serve(async (req) => {
  try {
    const corsResponse = handleCors(req);
    if (corsResponse) return corsResponse;
    
    console.log("🚀 Railway trigger request received");
    
    const { contactId } = await req.json();
    
    if (!contactId) {
      console.error("Missing required parameter: contactId");
      return new Response(
        JSON.stringify({ error: "Missing required parameter: contactId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Get contact details
    const contact = await getContactById(contactId);
    console.log(`🎯 Processing contact: ${contact.full_name} (${contact.email})`);
    
    // Download and extract postcodes from file
    const fileContent = await downloadFileContent("approved-uploads", contact.approved_file_path);
    const postcodes = extractPostcodes(fileContent);
    console.log(`📍 Extracted ${postcodes.length} postcodes for Railway processing`);
    
    if (postcodes.length === 0) {
      throw new Error("No valid postcodes found in file");
    }
    
    // Create processing job record
    const processingJob = await createProcessingJob(contactId, postcodes);
    console.log(`💾 Created processing job: ${processingJob.id}`);
    
    // Update contact status to processing
    await updateContactStatus(contactId, "scraping");
    
    // Prepare data for Railway API
    const railwayPayload = {
      processing_job_id: processingJob.id,
      contact_id: contactId,
      postcodes: postcodes,
      callback_url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/railway-webhook`,
      metadata: {
        contact_name: contact.full_name,
        contact_email: contact.email,
        company: contact.company
      }
    };
    
    // Call Railway API
    const railwayResult = await callRailwayAPI(railwayPayload);
    
    // Send confirmation emails
    await sendClientNotification(contact, postcodes, railwayResult);
    await sendAdminNotification(contact, contactId, processingJob.id, railwayResult, postcodes);
    
    return new Response(
      JSON.stringify({
        success: true,
        message: "Railway processing started successfully",
        contact_id: contactId,
        processing_job_id: processingJob.id,
        railway_job_id: railwayResult.job_id,
        postcodes_count: postcodes.length,
        status: "scraping",
        processing_system: "railway_api"
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
    
  } catch (err) {
    console.error('❌ ERROR in railway-trigger function:', err);
    
    return new Response(
      JSON.stringify({
        error: err.message || 'Internal server error',
        timestamp: new Date().toISOString()
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
