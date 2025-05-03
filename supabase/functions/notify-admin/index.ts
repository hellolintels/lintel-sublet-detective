
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
  console.log(`Sending email to: ${to}`);
  console.log(`Subject: ${subject}`);
  console.log(`Attachment file name: ${fileName}`);
  console.log(`Attachment file type: ${fileType}`);
  console.log(`Attachment base64 content length: ${fileContent.length} characters`);

  // Extract the actual base64 content if it includes a data URI prefix
  let cleanBase64Content = fileContent;
  if (fileContent.includes('base64,')) {
    cleanBase64Content = fileContent.split('base64,')[1];
    console.log(`Extracted clean base64 content (length: ${cleanBase64Content.length})`);
  }

  // Prepare the email message
  const msg = {
    to,
    from: 'notifications@lintels.in',
    subject,
    html: htmlContent,
    text: textContent,
    attachments: [
      {
        content: cleanBase64Content,
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
      </ul>
    </div>
    
    <p>Please check the Supabase dashboard for more details.</p>
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

    let contact;
    let fileName;
    let fileType;
    let fileContent;

    // Create Supabase client to fetch contact info if needed
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Get contact data from database
    const { data: contactData, error: contactError } = await supabase
      .from('contacts')
      .select('*')
      .eq('id', contactId)
      .single();

    if (contactError || !contactData) {
      throw new Error(`Contact not found: ${contactError?.message || 'Unknown error'}`);
    }

    contact = contactData;
    console.log(`Contact found: ${contact.full_name} (${contact.email})`);

    // Determine if we should use the direct file data or get it from the database
    if (directFileData && directFileData.fileName && directFileData.fileContent) {
      console.log("Using direct file data from the request");
      fileName = directFileData.fileName;
      fileType = directFileData.fileType || 'application/octet-stream';
      fileContent = directFileData.fileContent;
      
      console.log(`Direct file details: ${fileName}, type: ${fileType}, content length: ${fileContent.length}`);
    } else {
      console.log("No direct file data, using data from the database");
      fileName = contact.file_name;
      fileType = contact.file_type || 'application/octet-stream';
      fileContent = contact.file_data;
      
      if (!fileContent) {
        throw new Error("No file content found in contact record");
      }
    }

    console.log(`Final file details for email: ${fileName}, type: ${fileType}`);

    // Build email content
    const htmlContent = buildHtmlContent(contact);
    const textContent = `
      New form submission from ${contact.full_name}
      Email: ${contact.email}
      Phone: ${contact.phone}
      Company: ${contact.company || 'Not provided'}
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
