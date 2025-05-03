
import { serve } from 'https://deno.land/x/sift@0.6.0/mod.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import sgMail from 'https://esm.sh/@sendgrid/mail@7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    // Parse the request body
    const body = await req.json();
    const { contactId, directFileData } = body;

    console.log(`⭐ Processing notification for contact ID: ${contactId}`);
    console.log(`⭐ Direct file data provided: ${directFileData ? 'Yes' : 'No'}`);

    if (!contactId) {
      throw new Error("Contact ID is required");
    }

    // Create Supabase client to fetch contact info
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    );

    // Get contact data from database
    const { data: contact, error: contactError } = await supabase
      .from('contacts')
      .select('*')
      .eq('id', contactId)
      .single();

    if (contactError || !contact) {
      throw new Error(`Contact not found: ${contactError?.message || 'Unknown error'}`);
    }

    console.log(`⭐ Contact found: ${contact.full_name} (${contact.email})`);

    // Use the direct file data from the request if available
    if (!directFileData || !directFileData.fileName || !directFileData.fileContent) {
      throw new Error("Missing file data in request");
    }

    const fileName = directFileData.fileName;
    const fileType = directFileData.fileType || 'text/csv';
    const fileContent = directFileData.fileContent;
    
    console.log(`⭐ File info for email attachment: ${fileName}, type: ${fileType}`);
    console.log(`⭐ File content length for attachment: ${fileContent.length} chars`);

    // Configure SendGrid
    sgMail.setApiKey(Deno.env.get('SENDGRID_API_KEY') || '');

    // Build a simple HTML email
    const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #2196F3; border-radius: 5px;">
      <h1 style="color: #2196F3; text-align: center;">New Address Submission</h1>
      
      <p>A new address list has been submitted from ${contact.full_name}.</p>
      
      <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 15px 0;">
        <h3 style="margin-top: 0;">User Details:</h3>
        <ul>
          <li><strong>Full Name:</strong> ${contact.full_name}</li>
          <li><strong>Position:</strong> ${contact.position || 'Not provided'}</li>
          <li><strong>Company:</strong> ${contact.company || 'Not provided'}</li>
          <li><strong>Email:</strong> ${contact.email}</li>
          <li><strong>Phone:</strong> ${contact.phone}</li>
          <li><strong>Form Type:</strong> ${contact.form_type || 'sample'}</li>
          <li><strong>File Name:</strong> ${fileName || 'Not provided'}</li>
        </ul>
      </div>
    </div>
    `;

    const textContent = `
      New form submission from ${contact.full_name}
      Email: ${contact.email}
      Phone: ${contact.phone}
      Company: ${contact.company || 'Not provided'}
      File: ${fileName}
    `;

    // Prepare the email message
    const msg = {
      to: 'jamie@lintels.in',
      from: 'notifications@lintels.in',
      subject: `New Form Submission from ${contact.full_name}`,
      html: htmlContent,
      text: textContent,
      attachments: [
        {
          content: fileContent,
          filename: fileName,
          type: fileType,
          disposition: 'attachment',
        },
      ],
    };

    // Send the email
    console.log(`⭐ Sending email to jamie@lintels.in with file: ${fileName}`);
    const [response] = await sgMail.send(msg);
    
    console.log(`⭐ SendGrid response status: ${response.statusCode}`);
    console.log(`⭐ Email sent successfully with attachment: ${fileName}`);

    // Return success response
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Email sent successfully to jamie@lintels.in with attachment: ${fileName}`,
        contactId,
        fileName,
        statusCode: response.statusCode
      }), 
      { 
        status: 200, 
        headers: { 
          ...corsHeaders,
          "Content-Type": "application/json" 
        } 
      }
    );

  } catch (err: any) {
    console.error('❌ Error in notify-admin:', err);
    
    return new Response(
      JSON.stringify({ 
        error: err.message,
        stack: err.stack 
      }), 
      { 
        status: 500, 
        headers: { 
          ...corsHeaders,
          "Content-Type": "application/json" 
        } 
      }
    );
  }
});
