
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CHUNK_SIZE = 15; // Process 15 postcodes per chunk

export async function createProcessingJob(contactId: string, postcodes: any[]) {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing Supabase credentials");
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  const totalChunks = Math.ceil(postcodes.length / CHUNK_SIZE);
  
  const { data, error } = await supabase
    .from('processing_jobs')
    .insert({
      contact_id: contactId,
      total_postcodes: postcodes.length,
      total_chunks: totalChunks,
      postcodes: postcodes,
      status: 'pending'
    })
    .select('id')
    .single();
    
  if (error) {
    throw new Error(`Failed to create processing job: ${error.message}`);
  }
  
  console.log(`📋 Created processing job ${data.id} for ${postcodes.length} postcodes (${totalChunks} chunks)`);
  return data.id;
}

export async function triggerNextChunk(jobId?: string) {
  try {
    const response = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/auto-process-batch`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ jobId })
    });
    
    if (!response.ok) {
      throw new Error(`Failed to trigger processing: ${response.statusText}`);
    }
    
    const result = await response.json();
    console.log(`✅ Triggered next chunk processing:`, result);
    
    // If not completed, schedule next chunk
    if (result.success && !result.completed) {
      // Delay next chunk to prevent overwhelming the system
      setTimeout(() => triggerNextChunk(jobId), 30000); // 30 second delay
    }
    
    return result;
  } catch (error) {
    console.error('❌ Error triggering next chunk:', error);
    throw error;
  }
}
