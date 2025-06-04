
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { validateSubmissionRequest } from './request-validator.ts';
import { insertContact } from './contact-processor.ts';
import { sendAdminNotification } from './email-notifier.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const requestData = await req.json();
    
    // Validate the request
    const validatedData = validateSubmissionRequest(requestData);
    
    // Insert contact into database
    const contact = await insertContact(supabase, {
      full_name: validatedData.full_name,
      email: validatedData.email,
      company: validatedData.company,
      position: validatedData.position,
      phone: validatedData.phone,
      organization_type: validatedData.organization_type,
      organization_other: validatedData.organization_other,
      form_type: validatedData.form_type,
      file_name: validatedData.file_name,
      file_type: validatedData.file_type,
      approved_file_path: validatedData.storagePath
    });

    // Send notification email to admin
    const emailSent = await sendAdminNotification(supabase, {
      full_name: validatedData.full_name,
      email: validatedData.email,
      company: validatedData.company,
      position: validatedData.position,
      phone: validatedData.phone,
      organization_type: validatedData.organization_type,
      organization_other: validatedData.organization_other,
      form_type: validatedData.form_type,
      file_name: validatedData.file_name,
      storagePath: validatedData.storagePath,
      contactId: contact.id
    });

    return new Response(
      JSON.stringify({
        success: true,
        contactId: contact.id,
        emailSent: emailSent,
        message: 'Form submitted successfully'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('Function error:', error);
    
    return new Response(
      JSON.stringify({
        error: error.message || 'Internal server error',
        success: false
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
