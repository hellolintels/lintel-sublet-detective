
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export interface ContactData {
  full_name: string;
  email: string;
  company: string;
  position: string;
  phone: string;
  organization_type: string;
  organization_other?: string;
  form_type: string;
  file_name?: string;
  file_type?: string;
  approved_file_path: string;
}

export async function insertContact(supabase: any, contactData: ContactData) {
  console.log('Processing form submission:', {
    full_name: contactData.full_name,
    email: contactData.email,
    company: contactData.company,
    organization_type: contactData.organization_type,
    organization_other: contactData.organization_other,
    form_type: contactData.form_type
  });

  const { data: contact, error: contactError } = await supabase
    .from('contacts')
    .insert({
      full_name: contactData.full_name,
      email: contactData.email,
      company: contactData.company,
      position: contactData.position,
      phone: contactData.phone,
      organization_type: contactData.organization_type,
      organization_other: contactData.organization_other,
      form_type: contactData.form_type,
      file_name: contactData.file_name,
      file_type: contactData.file_type,
      approved_file_path: contactData.approved_file_path,
      status: 'new'
    })
    .select()
    .single();

  if (contactError) {
    console.error('Error inserting contact:', contactError);
    throw new Error(`Database error: ${contactError.message}`);
  }

  console.log('Contact created successfully:', contact.id);
  return contact;
}
