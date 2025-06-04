
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const {
      full_name,
      email,
      company,
      position,
      phone,
      organization_type,
      organization_other,
      storagePath,
      form_type,
      file_name,
      file_type
    } = await req.json();

    console.log('Processing form submission:', {
      full_name,
      email,
      company,
      organization_type,
      organization_other,
      form_type
    });

    // Insert into contacts table
    const { data: contact, error: contactError } = await supabase
      .from('contacts')
      .insert({
        full_name,
        email,
        company,
        position,
        phone,
        organization_type,
        organization_other,
        form_type,
        file_name,
        file_type,
        approved_file_path: storagePath,
        status: 'new'
      })
      .select()
      .single();

    if (contactError) {
      console.error('Error inserting contact:', contactError);
      throw new Error(`Database error: ${contactError.message}`);
    }

    console.log('Contact created successfully:', contact.id);

    // Send notification email to admin
    const adminEmail = Deno.env.get('APPROVER_EMAIL') || 'jamie@lintels.in';
    
    const emailSubject = `[Lintels] New ${form_type} Request - ${company}`;
    const emailBody = `
      <h2>New Contact Form Submission</h2>
      <p><strong>Name:</strong> ${full_name}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Company:</strong> ${company}</p>
      <p><strong>Position:</strong> ${position}</p>
      <p><strong>Phone:</strong> ${phone}</p>
      <p><strong>Organization Type:</strong> ${organization_type}</p>
      ${organization_other ? `<p><strong>Organization Details:</strong> ${organization_other}</p>` : ''}
      <p><strong>Form Type:</strong> ${form_type}</p>
      <p><strong>File:</strong> ${file_name}</p>
      <p><strong>File Path:</strong> ${storagePath}</p>
      <p><strong>Contact ID:</strong> ${contact.id}</p>
      
      <p>Please review this submission in the admin dashboard.</p>
    `;

    try {
      const { error: emailError } = await supabase.functions.invoke('send-email', {
        body: {
          to: adminEmail,
          subject: emailSubject,
          html: emailBody
        }
      });

      if (emailError) {
        console.error('Email sending error:', emailError);
        // Don't fail the whole request if email fails
      }
    } catch (emailErr) {
      console.error('Email function error:', emailErr);
      // Don't fail the whole request if email fails
    }

    return new Response(
      JSON.stringify({
        success: true,
        contactId: contact.id,
        emailSent: true,
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
