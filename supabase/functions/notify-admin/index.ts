
import { serve } from 'https://deno.land/x/sift@0.6.0/mod.ts';
import { corsHeaders } from './utils/cors.ts';
import { getContactById } from './utils/contacts.ts';
import { processFileData } from './utils/file-processor.ts';
import { buildEmailContent } from './utils/email-builder.ts';
import { sendEmail } from './utils/email-sender.ts';

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    const body = await req.json();
    const { contactId } = body;

    console.log(`Processing notification for contact ID: ${contactId}`);

    // Get the contact record with file data
    const contact = await getContactById(contactId);
    
    // Process the file data
    const fileName = contact.file_name || `addresses_${contactId}.csv`;
    const fileType = contact.file_type || 'text/csv';
    
    console.log(`Processing file: ${fileName}, type: ${fileType}`);
    
    // Convert file data to base64 for email attachment
    const fileContent = processFileData(contact.file_data);

    // Build the email content
    const htmlContent = buildEmailContent(contact);
    
    // Plain text version of the email
    const textContent = `
New form submission:

Name: ${contact.full_name}
Email: ${contact.email}
Phone: ${contact.phone}
Company: ${contact.company}
Position: ${contact.position || 'Not provided'}
    `;

    // Send the notification email
    const emailResult = await sendEmail(
      'jamie@lintels.in',
      `New Form Submission from ${contact.full_name}`,
      htmlContent,
      textContent,
      fileContent,
      fileName,
      fileType
    );

    // Return result to the client
    return new Response(
      JSON.stringify({ 
        success: emailResult.success, 
        message: emailResult.message, 
        withAttachment: emailResult.withAttachment
      }), 
      { 
        status: emailResult.success ? 200 : 500, 
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
