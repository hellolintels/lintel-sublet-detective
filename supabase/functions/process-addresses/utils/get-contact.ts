
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

/**
 * Fetches contact information from the database
 * @param contactId The ID of the contact to fetch
 * @returns The contact data or throws an error if not found
 */
export async function getContactById(contactId: string) {
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
