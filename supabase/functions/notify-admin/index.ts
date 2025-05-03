
import { serve } from 'https://deno.land/x/sift@0.6.0/mod.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import sgMail from 'https://esm.sh/@sendgrid/mail@7';
import { corsHeaders } from './utils/cors.ts';

// Simple email sending function that works directly with the provided data
async function sendEmailWithAttachment(
  to: string,
  subject: string,
  htmlContent: string,
  textContent: string,
  fileContent: string,
  fileName: string,
  fileType: string
) {
  // Configure SendGrid
  sgMail.setApiKey(Deno.env.get('SENDGRID_API_KEY')!);

  // Log details for verification
  console.log(`SENDING EMAIL TO: ${to}`);
  console.log(`SUBJECT: ${subject}`);
  console.log(`ATTACHMENT FILE NAME: ${fileName}`);
  console.log(`ATTACHMENT FILE TYPE: ${fileType}`);
  console.log(`ATTACHMENT BASE64 CONTENT LENGTH: ${fileContent.length} characters`);

  // Prepare the email message
  const msg = {
    to,
    from: 'notifications@lintels.in',
    subject,
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

  try {
    console.log(`Sending email with attachment: ${fileName}`);
    const [response] = await sgMail.send(msg);
    
    console.log("Email sent successfully:", {
      statusCode: response.statusCode,
      headers: response.headers
    });
    
    return { 
      success: true, 
      message: "Email sent successfully" 
    };
  } catch (error) {
    console.error("SendGrid error:", error);
    return { 
      success: false, 
      message: `Failed to send email: ${error.message || 'Unknown error'}`
    };
  }
}

function buildHtmlContent(contact: any) {
  return `
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
        <li><strong>File Name:</strong> ${contact.file_name || 'Not provided'}</li>
      </ul>
    </div>
  </div>
  `;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    // Parse the request body
    const body = await req.json();
    const { contactId, directFileData } = body;

    console.log(`Processing notification for contact ID: ${contactId}`);
    console.log(`Direct file data provided: ${directFileData ? 'Yes' : 'No'}`);

    // Create Supabase client to fetch contact info
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
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

    console.log(`Contact found: ${contact.full_name} (${contact.email})`);

    // Use the direct file data from the request
    if (!directFileData || !directFileData.fileName || !directFileData.fileContent) {
      throw new Error("Missing file data in request");
    }

    const fileName = directFileData.fileName;
    const fileType = directFileData.fileType || 'application/octet-stream';
    const fileContent = directFileData.fileContent;
    
    console.log(`File details for email: ${fileName}, type: ${fileType}, content length: ${fileContent.length}`);

    // Build email content
    const htmlContent = buildHtmlContent(contact);
    const textContent = `
      New form submission from ${contact.full_name}
      Email: ${contact.email}
      Phone: ${contact.phone}
      Company: ${contact.company || 'Not provided'}
      File: ${fileName}
    `;

    // Send the email with attachment
    const emailResult = await sendEmailWithAttachment(
      'jamie@lintels.in',
      `New Form Submission from ${contact.full_name}`,
      htmlContent,
      textContent,
      fileContent,
      fileName,
      fileType
    );

    if (!emailResult.success) {
      console.error("Email sending failed:", emailResult.message);
      throw new Error(`Failed to send email: ${emailResult.message}`);
    }

    // Return success response
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Admin notification sent successfully",
        contactId: contactId,
        fileName: fileName
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
    console.error('Error in notify-admin:', err);
    return new Response(
      JSON.stringify({ error: err.message }), 
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
