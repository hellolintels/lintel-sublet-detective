
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export async function createProcessingJob(contactId: string, postcodes: any[]) {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase credentials');
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  const { data, error } = await supabase
    .from('processing_jobs')
    .insert({
      contact_id: contactId,
      status: 'railway_processing',
      total_postcodes: postcodes.length,
      postcodes: postcodes,
      scraping_method: 'railway_api'
    })
    .select()
    .single();
    
  if (error) {
    console.error('Error creating processing job:', error);
    throw new Error('Failed to create processing job');
  }
  
  return data;
}
