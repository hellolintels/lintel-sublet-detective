import { serve } from 'https://deno.land/x/sift@0.6.0/mod.ts';
import { handleApproveProcessing } from './handlers/approve-processing.ts';
import { handleRejectProcessing } from './handlers/reject-processing.ts';
import { handleInitialProcess } from './handlers/initial-process.ts';
import { handleSendResults } from './handlers/send-results.ts';
import { corsHeaders } from './constants.ts';

// Supabase env vars
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.warn('⚠ SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variable is not defined.');
}

serve(async (req) => {
  console.log('🔄 process-addresses function called');
  const url = new URL(req.url);
  const action = url.searchParams.get('action');
  const contactId = url.searchParams.get('contact_id');
  const reportId = url.searchParams.get('report_id'); // optional, used by send_results

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!action || !contactId) {
      return new Response(JSON.stringify({ error: 'Invalid action or missing contact ID' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Setup Supabase client
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch contact record
    const { data: contact, error } = await supabase.from('contacts').select('*').eq('id', contactId).single();
    if (error || !contact) {
      return new Response(JSON.stringify({ error: 'Contact not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Action requested: ${action}, Contact ID: ${contactId}`);

    // Call the correct handler
    if (action === 'approve_processing') {
      return await handleApproveProcessing(supabase, contact, reportId, SUPABASE_URL);
    }
    if (action === 'reject_processing') {
      return await handleRejectProcessing(contactId, corsHeaders);
    }
    if (action === 'initial_process') {
      return await handleInitialProcess(supabase, contact, SUPABASE_URL);
    }
    if (action === 'send_results') {
      return await handleSendResults(supabase, contact, reportId);
    }

    return new Response(JSON.stringify({ error: 'Invalid action specified' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Error in process-addresses function:', err);
    return new Response(JSON.stringify({ error: err.message || 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
