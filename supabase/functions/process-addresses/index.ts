
import { serve } from 'https://deno.land/x/sift@0.6.0/mod.ts';
import { handleApproveProcessing } from './handlers/approve-processing.ts';
import { handleRejectProcessing } from './handlers/reject-processing.ts';
import { handleInitialProcess } from './handlers/initial-process.ts';
import { handleSendResults } from './handlers/send-results.ts';
import { corsHeaders } from './constants.ts';
import { scrapePostcodes } from './scraping/bright-data-scraper.ts';
import { createLogger, LogLevel } from '../_shared/debug-logger.ts';
import { createRequestHandler } from '../_shared/request-handler.ts';

// Create a module-specific logger
const logger = createLogger({ module: 'process-addresses' });

const PROJECT_REF = Deno.env.get('PROJECT_REF');
if (!PROJECT_REF) {
  logger.warn('PROJECT_REF environment variable is not defined.');
}

// Our instrumented request handler
const handler = createRequestHandler(async (req, log) => {
  log.info('🔄 process-addresses function called');
  log.debug('✅ process-addresses function deployed and running');

  // For requests with JSON body
  let requestBody;
  const contentType = req.headers.get('content-type') || '';
  
  if (contentType.includes('application/json')) {
    requestBody = await req.json();
    log.debug('Received JSON payload', requestBody);
  } else {
    // For requests with URL parameters
    const url = new URL(req.url);
    requestBody = {
      action: url.searchParams.get('action'),
      contactId: url.searchParams.get('contact_id'),
      reportId: url.searchParams.get('report_id')
    };
    log.debug('Received URL parameters', requestBody);
  }
  
  const { action, contactId, reportId, postcodes, testType } = requestBody;
  log.info(`Action requested: ${action}, Contact ID: ${contactId}, Report ID: ${reportId}`);
  
  if (action === 'test_bright_data' && postcodes) {
    log.info(`Testing Bright Data with ${postcodes.length} postcodes, test type: ${testType || 'basic'}`);
    
    try {
      const results = await log.time(
        'Bright Data scraping process', 
        () => scrapePostcodes(postcodes)
      );
      
      // Add connection status for comprehensive testing
      const connectionData = {
        results,
        connectionStatus: 'success',
        timestamp: new Date().toISOString(),
        testType: testType || 'basic'
      };
      
      log.info('Bright Data test completed successfully');
      return connectionData;
    } catch (error) {
      log.error('Error during Bright Data test:', error);
      return { 
        error: error.message || 'Unknown error', 
        connectionStatus: 'failed',
        connectionError: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !supabaseKey) {
    log.error('Supabase credentials not configured');
    throw new Error('Server error: Supabase credentials missing');
  }

  const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
  const supabase = createClient(supabaseUrl, supabaseKey);
  log.debug('Supabase client initialized');

  // Fetch from pending_submissions
  let contact = null;
  if (contactId) {
    log.debug(`Fetching submission with ID: ${contactId}`);
    const { data, error } = await supabase
      .from('pending_submissions')
      .select('*')
      .eq('id', contactId)
      .single();

    if (error || !data) {
      log.error('❌ Submission not found or error fetching from pending_submissions:', error);
      throw new Error('Submission not found');
    }
    contact = data;
    log.debug('Found submission', { id: contact.id, name: contact.full_name, email: contact.email });
  }

  if (action === 'approve_processing' && contact) {
    log.info(`Processing approval for contact ID: ${contact.id}`);
    return await handleApproveProcessing(supabase, contact, reportId, supabaseUrl);
  }

  if (action === 'reject_processing' && contact) {
    log.info(`Rejecting processing for contact ID: ${contact.id}`);
    return await handleRejectProcessing(contactId, corsHeaders);
  }

  if (action === 'initial_process' && contact) {
    log.info(`Initial processing for contact ID: ${contact.id}`);
    return await handleInitialProcess(supabase, contact, supabaseUrl);
  }

  if (action === 'send_results' && contact) {
    log.info(`Sending results for contact ID: ${contact.id}, report ID: ${reportId}`);
    return await handleSendResults(supabase, contact, reportId);
  }

  log.warn('Invalid action or missing contact ID', requestBody);
  throw new Error('Invalid action or missing contact ID');
});

serve(handler);
