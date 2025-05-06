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
    return new Response(null, {
      headers: corsHeaders,
    });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get('action');
    const contactId = url.searchParams.get('contact_id');
    console.log(`Action requested: ${action}, Contact ID: ${contactId}`);

    if (action === 'approve_processing' && contactId) {
      return await handleApproveProcessing(contactId, corsHeaders);
    }
    if (action === 'reject_processing' && contactId) {
      return await handleRejectProcessing(contactId, corsHeaders);
    }
    if (action === 'initial_process' && contactId) {
      return await handleInitialProcess(contactId, corsHeaders);
    }
    if (action === 'send_results' && contactId) {
      return await handleSendResults(contactId, corsHeaders);
    }

    return new Response(
      JSON.stringify({
        error: 'Invalid action or missing contact ID',
      }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      },
    );
  } catch (err) {
    console.error('Error in process-addresses function:', err);
    return new Response(
      JSON.stringify({
        error: err.message || 'Unknown error',
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      },
    );
  }
});
