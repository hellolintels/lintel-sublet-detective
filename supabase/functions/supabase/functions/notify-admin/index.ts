import { serve } from 'https://deno.land/x/sift@0.6.0/mod.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import sgMail from 'https://esm.sh/@sendgrid/mail@7';

serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const body = await req.json();
    const { contactId } = body;

    const { data: contact, error } = await supabase
      .from('contacts')
      .select('*')
      .eq('id', contactId)
      .single();

    if (error || !contact) throw new Error('Contact not found');

    const { data: file, error: fileError } = await supabase
      .storage
      .from('address-lists')
      .download(contact.file_name);

    if (fileError || !file) throw new Error('File not found');

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Content = buffer.toString('base64');

    sgMail.setApiKey(Deno.env.get('SENDGRID_API_KEY')!);

    const msg = {
      to: 'jamie@lintel.in',
      from: 'noreply@lintel.in',
      subject: `New Form Submission from ${contact.full_name}`,
      text: `
New form submission:

Name: ${contact.full_name}
Email: ${contact.email}
Phone: ${contact.phone}
Company: ${contact.company}
      `,
      attachments: [
        {
          content: base64Content,
          filename: contact.file_name,
          type: 'text/csv',
          disposition: 'attachment',
        },
      ],
    };

    await sgMail.send(msg);

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err) {
    console.error('Error in notify-admin:', err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});
