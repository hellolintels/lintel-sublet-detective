import { serve } from 'https://deno.land/x/sift@0.6.0/mod.ts';
import { handleApproveProcessing } from './handlers/approve-processing.ts';
import { handleRejectProcessing } from './handlers/reject-processing.ts';
import { handleInitialProcess } from './handlers/initial-process.ts';
import { handleSendResults } from './handlers/send-results.ts';
import { corsHeaders } from './constants.ts';

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
    const url = new URL(req.url);
    const action = url.searchParams.get('action');
    const contactId = url.searchParams.get('contact_id');
    const reportId = url.searchParams.get('report_id');

    console.log(`Action requested: ${action}, Contact ID: ${contactId}, Report ID: ${reportId}`);

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
