
import { serve } from 'https://deno.land/x/sift@0.6.0/mod.ts';
import { corsHeaders } from './utils/cors.ts';
import { getContactById } from './utils/contacts.ts';
import { processFileData } from './utils/file-processor.ts';
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
    
    if (!contact) {
      throw new Error(`Contact not found with ID: ${contactId}`);
    }
    
    // Log contact details for verification
    console.log(`Contact found: ${contact.full_name} (${contact.email})`);
    
    // Process the file data
    const fileName = contact.file_name || `addresses_${contactId}.csv`;
    const fileType = contact.file_type || 'text/csv';
    
    console.log(`Processing file: ${fileName}, type: ${fileType}`);
    console.log(`Raw file_data length: ${contact.file_data ? contact.file_data.length : 0}`);
    
    if (!contact.file_data) {
      console.error("No file data found in the contact record");
      throw new Error("Missing file data in contact record");
    }
    
    // Convert file data to base64 for email attachment
    const fileContent = processFileData(contact.file_data);
    
    if (!fileContent) {
      throw new Error("Failed to process file data for email attachment");
    }
    
    console.log(`Processed file content length: ${fileContent.length} bytes`);

    // Build the email content
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
        </ul>
        
        <h3>File Information:</h3>
        <ul>
          <li><strong>File Name:</strong> ${fileName}</li>
          <li><strong>File Type:</strong> ${fileType}</li>
          <li><strong>File Size:</strong> ${fileContent.length} bytes (base64)</li>
        </ul>
      </div>
      
      <p>Please check the Supabase dashboard for more details.</p>
    </div>
    `;
    
    // Plain text version of the email
    const textContent = `
New form submission:

Name: ${contact.full_name}
Email: ${contact.email}
Phone: ${contact.phone}
Company: ${contact.company}
Position: ${contact.position || 'Not provided'}
    `;

    // Send the notification email with attachment
    console.log(`Sending email to admin with ${fileContent.length} bytes attachment`);
    
    await sendEmail(
      'jamie@lintels.in',
      `New Form Submission from ${contact.full_name}`,
      htmlContent,
      textContent,
      fileContent,
      fileName,
      fileType
    );

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
