
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { handleCors, corsHeaders } from '../_shared/cors.ts';
import { updateContactStatus, createReport } from '../_shared/db.ts';
import { getContactById } from '../process-addresses/utils/get-contact.ts';
import { storeMatches, generateReportFromMatches } from '../process-addresses/utils/match-processor.ts';
import { sendEmail } from '../_shared/email.ts';

// HMAC verification function
async function verifyWebhookSignature(payload: string, signature: string, secret: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const payloadData = encoder.encode(payload);
  
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signatureBuffer = await crypto.subtle.sign('HMAC', cryptoKey, payloadData);
  const computedSignature = Array.from(new Uint8Array(signatureBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  
  // Compare with provided signature (remove 'sha256=' prefix if present)
  const providedSignature = signature.replace('sha256=', '');
  return computedSignature === providedSignature;
}

serve(async (req) => {
  try {
    // Handle CORS preflight
    const corsResponse = handleCors(req);
    if (corsResponse) return corsResponse;
    
    console.log("🔄 Railway webhook received");
    
    // Get webhook secret
    const webhookSecret = Deno.env.get('RAILWAY_WEBHOOK_SECRET');
    if (!webhookSecret) {
      throw new Error("Railway webhook secret not configured");
    }
    
    // Get request body and signature
    const rawPayload = await req.text();
    const signature = req.headers.get('X-Signature-256') || req.headers.get('x-signature-256') || '';
    
    // Verify webhook signature
    const isValid = await verifyWebhookSignature(rawPayload, signature, webhookSecret);
    if (!isValid) {
      console.error("❌ Invalid webhook signature");
      return new Response(
        JSON.stringify({ error: "Invalid signature" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    console.log("✅ Webhook signature verified");
    
    // Parse the payload
    const webhookData = JSON.parse(rawPayload);
    console.log("📨 Webhook data received:", JSON.stringify(webhookData, null, 2));
    
    const { contact_id, job_id, status, results, error_message } = webhookData;
    
    if (!contact_id) {
      throw new Error("Missing contact_id in webhook payload");
    }
    
    // Get contact details
    const contact = await getContactById(contact_id);
    console.log(`📋 Processing webhook for contact: ${contact.full_name}`);
    
    if (status === 'completed' && results) {
      console.log(`✅ Railway processing completed for contact ${contact_id}`);
      
      // Transform Railway results to match our expected format
      const transformedResults = results.map((result: any) => ({
        postcode: result.postcode,
        address: result.address,
        airbnb: transformPlatformResult(result.airbnb),
        spareroom: transformPlatformResult(result.spareroom),
        gumtree: transformPlatformResult(result.gumtree)
      }));
      
      // Store matches in database
      const storedMatches = await storeMatches(contact_id, transformedResults);
      console.log(`💾 Stored ${storedMatches} match results`);
      
      // Generate and send report
      const { htmlReport, excelReport, matchesCount } = await generateReportFromMatches(contact_id, contact);
      
      // Create report record
      const reportId = await createReport(contact_id, results.length, matchesCount, htmlReport);
      
      // Send report email to client
      const reportFileName = `lintels-report-${contact.full_name.replace(/\s+/g, '-')}-${contact.company.replace(/\s+/g, '-')}`;
      
      await sendEmail(
        contact.email,
        `Your Lintels Property Report - ${contact.company}`,
        htmlReport,
        undefined,
        {
          content: excelReport,
          filename: `${reportFileName}.xls`,
          contentType: 'application/vnd.ms-excel'
        }
      );
      
      // Update contact status
      await updateContactStatus(contact_id, "report_sent");
      
      // Notify admin
      const adminEmail = Deno.env.get('APPROVER_EMAIL') || 'jamie@lintels.in';
      await sendEmail(
        adminEmail,
        `[Lintels] Railway Report Completed - ${contact.company}`,
        `
        <p>Hello,</p>
        <p>Railway processing has completed successfully for ${contact.full_name} from ${contact.company}.</p>
        <p><strong>Results Summary:</strong></p>
        <ul>
          <li>Contact ID: ${contact_id}</li>
          <li>Railway Job ID: ${job_id}</li>
          <li>Total Addresses Processed: ${results.length}</li>
          <li>Matches Found: ${matchesCount}</li>
          <li>Report Status: Sent to client</li>
        </ul>
        <p>The complete report has been automatically sent to the client.</p>
        `
      );
      
      console.log(`📧 Report sent successfully to ${contact.email}`);
      
    } else if (status === 'failed') {
      console.error(`❌ Railway processing failed for contact ${contact_id}: ${error_message}`);
      
      // Update contact status
      await updateContactStatus(contact_id, "error");
      
      // Notify admin of failure
      const adminEmail = Deno.env.get('APPROVER_EMAIL') || 'jamie@lintels.in';
      await sendEmail(
        adminEmail,
        `[Lintels] Railway Processing Failed - ${contact.company}`,
        `
        <p>Hello,</p>
        <p>Railway processing has failed for ${contact.full_name} from ${contact.company}.</p>
        <p><strong>Error Details:</strong></p>
        <ul>
          <li>Contact ID: ${contact_id}</li>
          <li>Railway Job ID: ${job_id}</li>
          <li>Error Message: ${error_message || 'Unknown error'}</li>
          <li>Contact Email: ${contact.email}</li>
        </ul>
        <p>Please review the error and consider manual processing or contacting the client.</p>
        `
      );
      
    } else {
      console.log(`📊 Railway status update for contact ${contact_id}: ${status}`);
      // Handle other status updates (in_progress, etc.)
    }
    
    return new Response(
      JSON.stringify({
        success: true,
        message: "Webhook processed successfully",
        contact_id,
        status
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
    
  } catch (err) {
    console.error('❌ ERROR in railway-webhook function:', err);
    
    return new Response(
      JSON.stringify({
        error: err.message || 'Internal server error',
        timestamp: new Date().toISOString()
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Transform Railway platform results to our expected format
function transformPlatformResult(platformResult: any) {
  if (!platformResult) {
    return { status: "error", message: "No result data" };
  }
  
  // Handle Railway result format
  if (platformResult.status === "investigate") {
    return {
      status: "investigate",
      url: platformResult.url,
      matches: platformResult.matches || [],
      count: platformResult.count || (platformResult.matches ? platformResult.matches.length : 0)
    };
  } else if (platformResult.status === "no_match") {
    return {
      status: "no_match",
      url: platformResult.search_url || platformResult.url,
      message: "No matching listings found"
    };
  } else if (platformResult.status === "error") {
    return {
      status: "error",
      message: platformResult.message || "Processing error"
    };
  }
  
  // Default fallback
  return {
    status: platformResult.status || "error",
    url: platformResult.url,
    message: platformResult.message
  };
}
