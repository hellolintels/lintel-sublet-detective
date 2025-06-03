
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { handleCors, corsHeaders } from '../_shared/cors.ts';
import { updateContactStatus, createReport } from '../_shared/db.ts';
import { sendEmail } from '../_shared/email.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Inline getContactById function to avoid cross-function imports
async function getContactById(contactId: string) {
  // Validate UUID format using regex
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!contactId || !uuidRegex.test(contactId)) {
    console.error('Invalid contact ID format');
    throw new Error('Invalid contact ID format');
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing required environment variables');
    throw new Error('Server configuration error');
  }
  
  const supabase = createClient(
    supabaseUrl,
    supabaseKey,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      }
    }
  );

  try {
    // Using paranoid timeout to prevent long-running queries
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const { data: contact, error } = await supabase
      .from('contacts')
      .select('*')
      .eq('id', contactId)
      .single();
    
    clearTimeout(timeoutId);

    if (error || !contact) {
      console.error('Contact not found:', error);
      throw new Error('Contact not found');
    }

    console.log(`Found contact: ${contact.full_name}, email: ${contact.email}, file: ${contact.file_name}`);
    
    return contact;
  } catch (error) {
    if (error.name === 'AbortError') {
      console.error('Database query timed out');
      throw new Error('Operation timed out');
    }
    console.error('Error in getContactById:', error);
    throw error;
  }
}

// Inline file download function
async function downloadFileContent(bucket: string, path: string): Promise<string> {
  try {
    console.log(`Downloading file from ${bucket}/${path}`);
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Storage configuration error: Missing credentials");
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const { data, error } = await supabase
      .storage
      .from(bucket)
      .download(path);
      
    if (error) {
      console.error("File download failed:", error);
      throw new Error("Storage error: " + error.message);
    }
    
    if (!data) {
      throw new Error("No file data returned");
    }
    
    const content = await data.text();
    console.log("File downloaded successfully, size:", content.length);
    return content;
  } catch (error) {
    console.error("File download error:", error);
    throw error;
  }
}

// Inline postcode extraction function
function extractPostcodes(content: string): Array<{postcode: string, address: string}> {
  try {
    console.log("Extracting postcodes from file content");
    
    // Clean content and split into lines
    const cleanContent = content.replace(/^\uFEFF/, '');
    const lines = cleanContent.split('\n').filter(line => line.trim().length > 0);
    
    if (lines.length <= 1) {
      console.warn("File contains no data rows");
      return [];
    }
    
    // Remove header row
    const dataRows = lines.slice(1);
    
    // UK postcodes regex pattern
    const postcodeRegex = /[A-Z]{1,2}[0-9][A-Z0-9]? ?[0-9][A-Z]{2}/i;
    
    // Extract postcodes from each line
    const postcodes: Array<{postcode: string, address: string}> = [];
    const uniquePostcodes = new Set<string>();
    
    dataRows.forEach(line => {
      // Split by comma if CSV
      const parts = line.split(',');
      
      // Find a part that looks like a postcode
      for (const part of parts) {
        const trimmed = part.trim();
        const match = trimmed.match(postcodeRegex);
        
        if (match) {
          const postcode = match[0].toUpperCase().replace(/\s+/g, ' ');
          
          // Only add unique postcodes
          if (!uniquePostcodes.has(postcode)) {
            uniquePostcodes.add(postcode);
            postcodes.push({
              postcode,
              address: line.trim()
            });
          }
          
          break;
        }
      }
    });
    
    console.log(`Found ${postcodes.length} unique postcodes`);
    return postcodes;
  } catch (error) {
    console.error("Error extracting postcodes:", error);
    return [];
  }
}

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
