
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { handleCors, corsHeaders } from '../_shared/cors.ts';
import { getContactById } from '../process-addresses/utils/get-contact.ts';
import { extractPostcodes } from '../process-addresses/utils/postcode-extractor.ts';
import { downloadFileContent } from '../_shared/storage.ts';
import { updateContactStatus, createReport } from '../_shared/db.ts';
import { sendEmail } from '../_shared/email.ts';

serve(async (req) => {
  try {
    // Handle CORS preflight
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
    
    // Update contact status to processing
    await updateContactStatus(contactId, "scraping");
    
    // Get Railway API credentials
    const railwayApiUrl = Deno.env.get('RAILWAY_API_URL');
    const railwayApiKey = Deno.env.get('RAILWAY_API_KEY');
    
    if (!railwayApiUrl || !railwayApiKey) {
      throw new Error("Railway API credentials not configured");
    }
    
    // Prepare data for Railway API
    const railwayPayload = {
      contact_id: contactId,
      postcodes: postcodes.map(pc => pc.postcode),
      callback_url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/railway-webhook`,
      metadata: {
        contact_name: contact.full_name,
        contact_email: contact.email,
        company: contact.company
      }
    };
    
    console.log(`🔄 Sending ${postcodes.length} postcodes to Railway API`);
    
    // Call Railway API
    const railwayResponse = await fetch(`${railwayApiUrl}/api/process`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${railwayApiKey}`
      },
      body: JSON.stringify(railwayPayload)
    });
    
    if (!railwayResponse.ok) {
      const errorText = await railwayResponse.text();
      throw new Error(`Railway API error: ${railwayResponse.status} - ${errorText}`);
    }
    
    const railwayResult = await railwayResponse.json();
    console.log(`✅ Railway job started:`, railwayResult);
    
    // Send confirmation email to client
    await sendEmail(
      contact.email,
      `Your Property Report is Being Processed - ${contact.company}`,
      `
      <p>Hello ${contact.full_name},</p>
      <p>Great news! Your property matching report is now being processed using our advanced Railway system.</p>
      <p><strong>Processing Details:</strong></p>
      <ul>
        <li>Total Addresses: ${postcodes.length}</li>
        <li>Job ID: ${railwayResult.job_id || 'Processing'}</li>
        <li>Expected Completion: Within 2-4 hours</li>
        <li>Processing System: Railway API with enhanced matching</li>
      </ul>
      <p>Our system will automatically check Airbnb, SpareRoom, and Gumtree for matching properties. You will receive an email with your complete report once processing is finished.</p>
      <p>Thank you for choosing Lintels.in!</p>
      <p>Best regards,<br>The Lintels Team</p>
      `
    );
    
    // Notify admin
    const adminEmail = Deno.env.get('APPROVER_EMAIL') || 'jamie@lintels.in';
    await sendEmail(
      adminEmail,
      `[Lintels] Railway Processing Started - ${contact.company}`,
      `
      <p>Hello,</p>
      <p>Railway processing has started for ${contact.full_name} from ${contact.company}.</p>
      <p><strong>Processing Details:</strong></p>
      <ul>
        <li>Contact ID: ${contactId}</li>
        <li>Job ID: ${railwayResult.job_id || 'Processing'}</li>
        <li>Total Postcodes: ${postcodes.length}</li>
        <li>Contact Email: ${contact.email}</li>
        <li>Processing Method: Railway API</li>
        <li>Expected Completion: Within 2-4 hours</li>
      </ul>
      <p>The system will automatically process all postcodes and send the report to the client when complete.</p>
      `
    );
    
    return new Response(
      JSON.stringify({
        success: true,
        message: "Railway processing started successfully",
        contact_id: contactId,
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
