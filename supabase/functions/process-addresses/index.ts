import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { handleApproveProcessing } from './handlers/approve-processing.ts';
import { handleRejectProcessing } from './handlers/reject-processing.ts';
import { handleInitialProcess } from './handlers/initial-process.ts';
import { handleSendResults } from './handlers/send-results.ts';
import { corsHeaders } from './constants.ts';
import { getContactById } from './utils/get-contact.ts';  // You may need to adjust this path

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const action = url.searchParams.get('action');
  const contactId = url.searchParams.get('contact_id');

  if (!contactId) {
    return new Response(JSON.stringify({ error: 'Missing contact_id' }), {
      status: 400,
      headers: corsHeaders,
    });
  }

  try {
    const contact = await getContactById(contactId);

    if (action === 'approve_processing') {
      return await handleApproveProcessing(supabase, contact);
    }
    if (action === 'reject_processing') {
      return await handleRejectProcessing(supabase, contact);
    }
    if (action === 'initial_process') {
      return await handleInitialProcess(supabase, contact);
    }
    if (action === 'send_results') {
      return await handleSendResults(supabase, contact);
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: corsHeaders,
    });
  } catch (err) {
    console.error('Error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
