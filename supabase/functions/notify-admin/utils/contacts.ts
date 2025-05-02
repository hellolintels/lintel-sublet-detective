
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

/**
 * Fetches contact information from the database
 * @param contactId The ID of the contact to fetch
 * @returns The contact data or throws an error if not found
 */
export async function getContactById(contactId: string) {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const { data: contact, error } = await supabase
    .from('contacts')
    .select('*')
    .eq('id', contactId)
    .single();

  if (error || !contact) {
    console.error("Contact not found:", error);
    throw new Error('Contact not found');
  }

  console.log(`Found contact: ${contact.full_name}, email: ${contact.email}, file: ${contact.file_name}`);
  
  return contact;
}
