
import { serve } from 'https://deno.land/x/sift@0.6.0/mod.ts';
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
    console.log('📨 notify-admin function called');
    
    // Parse the request body
    const body = await req.json();
    const { contactId, directFileData } = body;

    console.log(`📝 Processing contact ID: ${contactId}`);
    
    if (!contactId) {
      throw new Error("Contact ID is required");
    }

    // Set up SendGrid
    const sendgridApiKey = Deno.env.get('SENDGRID_API_KEY');
    if (!sendgridApiKey) {
      throw new Error('SendGrid API key not configured');
    }
    sgMail.setApiKey(sendgridApiKey);
    
    // Get contact data from Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase credentials not configured');
    }
    
    // Create Supabase client
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Get contact data
    const { data: contact, error: contactError } = await supabase
      .from('contacts')
      .select('*')
      .eq('id', contactId)
      .single();

    if (contactError || !contact) {
      console.error('Contact fetch error:', contactError);
      throw new Error(`Contact not found: ${contactError?.message || 'Unknown error'}`);
    }

    console.log(`📧 Contact found: ${contact.full_name} (${contact.email})`);
    
    // Verify file data is present
    if (!directFileData || !directFileData.fileName || !directFileData.fileContent) {
      console.error('Missing file data:', directFileData ? Object.keys(directFileData) : 'null');
      throw new Error('Missing file data in request');
    }

    const fileName = directFileData.fileName;
    const fileType = directFileData.fileType || 'text/csv';
    const fileContentBase64 = directFileData.fileContent;
    
    console.log(`📎 Processing attachment: ${fileName} (${fileType}), content length: ${fileContentBase64.length} chars`);
    
    // Decode the Base64 content back to plain text for CSV files
    let fileContent = fileContentBase64;
    let contentEncoding = 'base64';
    
    if (fileType === 'text/csv' || fileName.toLowerCase().endsWith('.csv')) {
      try {
        console.log('🔄 Decoding Base64 content to plain text for CSV file');
        const textDecoder = new TextDecoder('utf-8');
        const binaryData = Uint8Array.from(atob(fileContentBase64), c => c.charCodeAt(0));
        fileContent = textDecoder.decode(binaryData);
        contentEncoding = 'binary'; // Use binary for plain text
        console.log(`✅ Successfully decoded CSV. First 100 chars: "${fileContent.substring(0, 100)}..."`);
      } catch (decodeError) {
        console.error('❌ Error decoding Base64 content:', decodeError);
        // Fall back to using Base64 if decoding fails
        fileContent = fileContentBase64;
        contentEncoding = 'base64';
      }
    }

    // Build the email HTML body
    const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #e65c00;">New Address List Submission</h2>
      
      <p>A new address list has been submitted for processing.</p>
      
      <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 15px 0;">
        <h3 style="margin-top: 0;">Contact Details:</h3>
        <ul>
          <li><strong>Full Name:</strong> ${contact.full_name}</li>
          <li><strong>Position:</strong> ${contact.position || 'Not provided'}</li>
          <li><strong>Company:</strong> ${contact.company || 'Not provided'}</li>
          <li><strong>Email:</strong> ${contact.email}</li>
          <li><strong>Phone:</strong> ${contact.phone}</li>
          <li><strong>Form Type:</strong> ${contact.form_type || 'sample'}</li>
          <li><strong>File Name:</strong> ${fileName}</li>
        </ul>
      </div>
    </div>
    `;

    // Plain text version of the email
    const textContent = `
New form submission from ${contact.full_name}
Email: ${contact.email}
Phone: ${contact.phone}
Company: ${contact.company || 'Not provided'}
Position: ${contact.position || 'Not provided'}
File: ${fileName}
    `;
    
    // Prepare the email with attachment
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
          content_transfer_encoding: contentEncoding, // Specify how content is encoded
        },
      ],
    };

    // Send the email
    console.log(`📤 Sending email to jamie@lintels.in with file: ${fileName}`);
    const result = await sgMail.send(msg);
    console.log(`📬 Email sent successfully: Status ${result[0]?.statusCode || 'unknown'}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Email sent to jamie@lintels.in with attachment: ${fileName}`,
        emailFile: fileName,
        isDecoded: contentEncoding === 'binary',
      }), 
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );

  } catch (err) {
    console.error('❌ ERROR in notify-admin function:', err);
    return new Response(
      JSON.stringify({ error: err.message }), 
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
