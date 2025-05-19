
import { serve } from 'https://deno.land/x/sift@0.6.0/mod.ts';
import { handleApproveProcessing } from './handlers/approve-processing.ts';
import { handleRejectProcessing } from './handlers/reject-processing.ts';
import { handleInitialProcess } from './handlers/initial-process.ts';
import { handleSendResults } from './handlers/send-results.ts';
import { corsHeaders } from './constants.ts';
import { scrapePostcodes } from './scraping/bright-data-scraper.ts';

const PROJECT_REF = Deno.env.get('PROJECT_REF');
if (!PROJECT_REF) {
  console.warn('⚠ PROJECT_REF environment variable is not defined.');
}

serve(async (req) => {
  console.log('🔄 process-addresses function called');
  console.log('✅ process-addresses function deployed and running');

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // For requests with JSON body
    let requestBody;
    const contentType = req.headers.get('content-type') || '';
    
    if (contentType.includes('application/json')) {
      requestBody = await req.json();
    } else {
      // For requests with URL parameters
      const url = new URL(req.url);
      requestBody = {
        action: url.searchParams.get('action'),
        contactId: url.searchParams.get('contact_id'),
        reportId: url.searchParams.get('report_id')
      };
    }
    
    const { action, contactId, reportId, postcodes, testType } = requestBody;
    console.log(`Action requested: ${action}, Contact ID: ${contactId}, Report ID: ${reportId}`);
    
    if (action === 'test_bright_data' && postcodes) {
      console.log(`Testing Bright Data with ${postcodes.length} postcodes, test type: ${testType || 'basic'}`);
      try {
        const results = await scrapePostcodes(postcodes);
        
        // Add connection status for comprehensive testing
        const connectionData = {
          results,
          connectionStatus: 'success',
          timestamp: new Date().toISOString(),
          testType: testType || 'basic'
        };
        
        return new Response(
          JSON.stringify(connectionData),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      } catch (error) {
        console.error('Error during Bright Data test:', error);
        return new Response(
          JSON.stringify({ 
            error: error.message || 'Unknown error', 
            connectionStatus: 'failed',
            connectionError: error.message,
            timestamp: new Date().toISOString()
          }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseKey) {
      console.error('Supabase credentials not configured');
      return new Response('Server error: Supabase credentials missing', {
        status: 500,
        headers: corsHeaders
      });
    }

    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 🔥 CHANGED LINE: now fetching from pending_submissions instead of contacts
    let contact = null;
    if (contactId) {
      const { data, error } = await supabase
        .from('pending_submissions')  // <-- switched from 'contacts' to 'pending_submissions'
        .select('*')
        .eq('id', contactId)
        .single();

      if (error || !data) {
        console.error('❌ Contact not found or error fetching from pending_submissions:', error);
        return new Response('Submission not found', {
          status: 404,
          headers: corsHeaders
        });
      }
      contact = data;
    }

    if (action === 'approve_processing' && contact) {
      return await handleApproveProcessing(supabase, contact, reportId, supabaseUrl);
    }

    if (action === 'reject_processing' && contact) {
      return await handleRejectProcessing(contactId, corsHeaders);
    }

    if (action === 'initial_process' && contact) {
      return await handleInitialProcess(supabase, contact, supabaseUrl);
    }

    if (action === 'send_results' && contact) {
      return await handleSendResults(supabase, contact, reportId);
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action or missing contact ID' }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (err) {
    console.error('Error in process-addresses function:', err);
    return new Response(
      JSON.stringify({ error: err.message || 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
