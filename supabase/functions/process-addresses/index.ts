import { serve } from 'https://deno.land/x/sift@0.6.0/mod.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { handleApproveProcessing } from './handlers/approve-processing.ts';
import { handleRejectProcessing } from './handlers/reject-processing.ts';
import { handleInitialProcess } from './handlers/initial-process.ts';
import { handleSendResults } from './handlers/send-results.ts';
import { corsHeaders } from './constants.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
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
    const reportId = url.searchParams.get('report_id'); // optional

    console.log(`Action requested: ${action}, Contact ID: ${contactId}, Report ID: ${reportId}`);

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Supabase credentials are missing in env variables');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    if (!contactId) {
      throw new Error('Missing contact ID in request');
    }

    const { data: contact, error } = await supabase
      .from('contacts')
      .select('*')
      .eq('id', contactId)
      .single();

    if (error || !contact) {
      throw new Error('Contact not found in database');
    }

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

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('❌ Error in process-addresses function:', err);
    return new Response(JSON.stringify({
      error: err.message || 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
