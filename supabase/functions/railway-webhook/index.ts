
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { handleCors, corsHeaders } from '../_shared/cors.ts';
import { updateContactStatus, createReport } from '../_shared/db.ts';
import { sendEmail } from '../_shared/email.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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
  
  const providedSignature = signature.replace('sha256=', '');
  return computedSignature === providedSignature;
}

// Get contact by ID
async function getContactById(contactId: string) {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase credentials');
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  const { data: contact, error } = await supabase
    .from('contacts')
    .select('*')
    .eq('id', contactId)
    .single();
    
  if (error || !contact) {
    throw new Error('Contact not found');
  }
  
  return contact;
}

// Store property matches in the database
async function storePropertyMatches(processingJobId: string, results: any[]) {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase credentials');
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  let totalMatches = 0;
  const matchesToInsert = [];
  
  for (const result of results) {
    const { address_id, postcode, original_address, airbnb, spareroom } = result;
    
    // Process Airbnb results
    if (airbnb) {
      if (airbnb.outcome === 'investigate' && airbnb.properties) {
        for (const property of airbnb.properties) {
          matchesToInsert.push({
            processing_job_id: processingJobId,
            address_id,
            original_address,
            postcode,
            outcome: 'investigate',
            platform: 'airbnb',
            listing_url: property.listing_url,
            listing_title: property.title,
            map_view_url: property.map_view_url,
            confidence_score: property.confidence_score,
            property_data: property,
            search_urls: { search_url: airbnb.search_url }
          });
          totalMatches++;
        }
      } else {
        // Store no match or error result
        matchesToInsert.push({
          processing_job_id: processingJobId,
          address_id,
          original_address,
          postcode,
          outcome: airbnb.outcome || 'no_match',
          platform: 'airbnb',
          error_message: airbnb.error_message,
          search_urls: { search_url: airbnb.search_url }
        });
      }
    }
    
    // Process SpareRoom results
    if (spareroom) {
      if (spareroom.outcome === 'investigate' && spareroom.properties) {
        for (const property of spareroom.properties) {
          matchesToInsert.push({
            processing_job_id: processingJobId,
            address_id,
            original_address,
            postcode,
            outcome: 'investigate',
            platform: 'spareroom',
            listing_url: property.listing_url,
            listing_title: property.title,
            map_view_url: property.map_view_url,
            confidence_score: property.confidence_score,
            property_data: property,
            search_urls: { search_url: spareroom.search_url }
          });
          totalMatches++;
        }
      } else {
        // Store no match or error result
        matchesToInsert.push({
          processing_job_id: processingJobId,
          address_id,
          original_address,
          postcode,
          outcome: spareroom.outcome || 'no_match',
          platform: 'spareroom',
          error_message: spareroom.error_message,
          search_urls: { search_url: spareroom.search_url }
        });
      }
    }
  }
  
  // Insert all matches
  if (matchesToInsert.length > 0) {
    const { error } = await supabase
      .from('property_matches')
      .insert(matchesToInsert);
      
    if (error) {
      console.error('Error inserting property matches:', error);
      throw new Error('Failed to store property matches');
    }
  }
  
  console.log(`💾 Stored ${matchesToInsert.length} property match records (${totalMatches} actual matches)`);
  return { totalRecords: matchesToInsert.length, totalMatches };
}

// Generate and send report
async function generateAndSendReport(processingJobId: string, contact: any, totalMatches: number, totalProperties: number) {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase credentials');
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  // Fetch matches for report generation
  const { data: matches, error } = await supabase
    .from('property_matches')
    .select('*')
    .eq('processing_job_id', processingJobId)
    .eq('outcome', 'investigate')
    .order('postcode');
    
  if (error) {
    console.error('Error fetching matches for report:', error);
    throw new Error('Failed to fetch matches for report');
  }
  
  // Generate HTML report
  const htmlReport = generateHTMLReport(contact, matches || [], totalProperties, totalMatches);
  
  // Create report record
  const reportId = await createReport(contact.id, totalProperties, totalMatches, htmlReport);
  
  // Send report email to client
  const reportFileName = `lintels-report-${contact.full_name.replace(/\s+/g, '-')}-${contact.company.replace(/\s+/g, '-')}`;
  
  await sendEmail(
    contact.email,
    `Your Lintels Property Report - ${contact.company}`,
    htmlReport
  );
  
  console.log(`📧 Report sent successfully to ${contact.email}`);
  return reportId;
}

// Generate HTML report
function generateHTMLReport(contact: any, matches: any[], totalProperties: number, totalMatches: number): string {
  const matchesByPostcode = new Map();
  
  matches.forEach(match => {
    if (!matchesByPostcode.has(match.postcode)) {
      matchesByPostcode.set(match.postcode, []);
    }
    matchesByPostcode.get(match.postcode).push(match);
  });
  
  let reportHTML = `
    <html>
      <head>
        <title>Lintels Property Report - ${contact.company}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 30px; }
          .summary { background-color: #e8f4fd; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
          .postcode-section { margin-bottom: 30px; border: 1px solid #ddd; border-radius: 5px; }
          .postcode-header { background-color: #f1f1f1; padding: 10px; font-weight: bold; }
          .match { margin: 10px; padding: 10px; border-left: 3px solid #007bff; }
          .no-matches { color: #666; font-style: italic; padding: 10px; }
          a { color: #007bff; text-decoration: none; }
          a:hover { text-decoration: underline; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Property Report for ${contact.company}</h1>
          <p><strong>Contact:</strong> ${contact.full_name}</p>
          <p><strong>Generated:</strong> ${new Date().toLocaleDateString()}</p>
        </div>
        
        <div class="summary">
          <h2>Summary</h2>
          <p><strong>Total Properties Processed:</strong> ${totalProperties}</p>
          <p><strong>Potential Matches Found:</strong> ${totalMatches}</p>
          <p><strong>Processing Method:</strong> Railway API (Enhanced Matching)</p>
        </div>
        
        <h2>Detailed Results</h2>
  `;
  
  if (matchesByPostcode.size === 0) {
    reportHTML += '<p class="no-matches">No potential matches were found for any of the properties.</p>';
  } else {
    matchesByPostcode.forEach((postcodeMatches, postcode) => {
      reportHTML += `
        <div class="postcode-section">
          <div class="postcode-header">${postcode}</div>
      `;
      
      postcodeMatches.forEach((match: any) => {
        reportHTML += `
          <div class="match">
            <h4>${match.listing_title || 'Property Match'}</h4>
            <p><strong>Platform:</strong> ${match.platform}</p>
            <p><strong>Confidence:</strong> ${(match.confidence_score * 100).toFixed(1)}%</p>
            <p><a href="${match.listing_url}" target="_blank">View Listing</a></p>
            ${match.map_view_url ? `<p><a href="${match.map_view_url}" target="_blank">View on Map</a></p>` : ''}
          </div>
        `;
      });
      
      reportHTML += '</div>';
    });
  }
  
  reportHTML += `
        <div style="margin-top: 40px; padding: 20px; background-color: #f8f9fa; border-radius: 8px;">
          <p><strong>Note:</strong> These results are potential matches that require manual review. Please investigate each listing to confirm relevance to your properties.</p>
          <p>If you have any questions about this report, please contact us at jamie@lintels.in</p>
        </div>
      </body>
    </html>
  `;
  
  return reportHTML;
}

serve(async (req) => {
  try {
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
    
    const { processing_job_id, contact_id, status, results, error_message } = webhookData;
    
    if (!contact_id || !processing_job_id) {
      throw new Error("Missing required fields in webhook payload");
    }
    
    // Get contact details
    const contact = await getContactById(contact_id);
    console.log(`📋 Processing webhook for contact: ${contact.full_name}`);
    
    if (status === 'completed' && results) {
      console.log(`✅ Railway processing completed for contact ${contact_id}`);
      
      // Store property matches in database
      const { totalRecords, totalMatches } = await storePropertyMatches(processing_job_id, results);
      
      // Generate and send report
      const reportId = await generateAndSendReport(processing_job_id, contact, totalMatches, results.length);
      
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
          <li>Processing Job ID: ${processing_job_id}</li>
          <li>Total Properties Processed: ${results.length}</li>
          <li>Total Match Records: ${totalRecords}</li>
          <li>Actual Matches Found: ${totalMatches}</li>
          <li>Report Status: Sent to client</li>
        </ul>
        <p>The complete report has been automatically sent to the client.</p>
        `
      );
      
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
          <li>Processing Job ID: ${processing_job_id}</li>
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
        processing_job_id,
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
