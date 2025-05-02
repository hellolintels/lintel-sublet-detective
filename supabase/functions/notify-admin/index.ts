
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
    console.log(`Raw file_data length: ${contact.file_data ? contact.file_data.length : 0}`);
    if (contact.file_data) {
      console.log(`Raw file_data first 50 chars: ${contact.file_data.substring(0, 50)}`);
    }
    
    // Convert file data to base64 for email attachment
    const fileContent = processFileData(contact.file_data);
    console.log(`Processed file content length: ${fileContent ? fileContent.length : 0}`);
    if (fileContent) {
      console.log(`Processed file content first 50 chars: ${fileContent.substring(0, 50)}`);
      
      // End-to-end test verification
      console.log(`FILE INTEGRITY CHECK - File: ${fileName}`);
      console.log(`FILE INTEGRITY CHECK - Content Hash: ${await generateSimpleHash(fileContent)}`);
    }

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
        withAttachment: fileContent ? true : false,
        fileContentLength: fileContent ? fileContent.length : 0,
        fileName: fileName
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

// Simple function to generate a hash for end-to-end validation
async function generateSimpleHash(data: string): Promise<string> {
  try {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex.substring(0, 16); // Return first 16 chars of hash for brevity
  } catch (error) {
    console.error("Error generating hash:", error);
    return "hash_error";
  }
}
