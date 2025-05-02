
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
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const body = await req.json();
    const { contactId } = body;

    console.log(`Processing notification for contact ID: ${contactId}`);

    // Get the contact record with file data
    const { data: contact, error } = await supabase
      .from('contacts')
      .select('*')
      .eq('id', contactId)
      .single();

    if (error || !contact) {
      console.error("Contact not found:", error);
      throw new Error('Contact not found');
    }
    
    console.log(`Found contact: ${contact.full_name}, email: ${contact.email}, file: ${contact.file_name}`);
    
    // Process the file data
    // Handle different file_data formats with extensive logging
    let fileContent = '';
    let fileName = contact.file_name || `addresses_${contactId}.csv`;
    let fileType = contact.file_type || 'text/csv';
    
    console.log(`Processing file: ${fileName}, type: ${fileType}`);
    console.log(`File data type: ${typeof contact.file_data}`);
    
    if (contact.file_data) {
      // If file_data is a bytea from Postgres (starts with \x), convert it properly
      if (typeof contact.file_data === 'string' && contact.file_data.startsWith('\\x')) {
        console.log("Converting hex-encoded bytea to base64");
        
        try {
          // Remove the \x prefix and convert hex to base64
          const hexString = contact.file_data.substring(2);
          
          // Convert hex to binary array
          const binaryArray = new Uint8Array(hexString.length / 2);
          for (let i = 0; i < hexString.length; i += 2) {
            binaryArray[i/2] = parseInt(hexString.substring(i, i + 2), 16);
          }
          
          // Convert binary array to base64
          let binaryString = '';
          binaryArray.forEach(byte => {
            binaryString += String.fromCharCode(byte);
          });
          fileContent = btoa(binaryString);
          
          console.log("Converted hex bytea to base64, length:", fileContent.length);
        } catch (e) {
          console.error("Error converting hex to base64:", e);
          throw new Error('Failed to process file data');
        }
      } 
      // If file_data is already base64 but has a prefix like "data:application/csv;base64,"
      else if (typeof contact.file_data === 'string' && contact.file_data.includes('base64,')) {
        fileContent = contact.file_data.split('base64,')[1];
        console.log("Extracted base64 data from data URI, length:", fileContent.length);
      } 
      // If it's already a clean base64 string
      else if (typeof contact.file_data === 'string') {
        fileContent = contact.file_data;
        console.log("Using provided file_data as is, length:", fileContent.length);
      } 
      // If it's binary data (Uint8Array)
      else if (contact.file_data instanceof Uint8Array) {
        let binaryString = '';
        for (let i = 0; i < contact.file_data.length; i++) {
          binaryString += String.fromCharCode(contact.file_data[i]);
        }
        fileContent = btoa(binaryString);
        console.log("Converted binary data to base64, length:", fileContent.length);
      } else {
        console.error("Unsupported file_data format:", typeof contact.file_data);
        throw new Error('Unsupported file data format');
      }
      
      // Clean up the base64 string to ensure it only contains valid base64 characters
      fileContent = fileContent.replace(/[^A-Za-z0-9+/=]/g, '');
      console.log("Base64 content length after cleaning:", fileContent.length);
      
      // Validate the base64 content
      try {
        // Test decode a small sample to verify it's valid base64
        atob(fileContent.substring(0, Math.min(10, fileContent.length)));
        console.log("Base64 validation successful");
      } catch (e) {
        console.error("Invalid base64 data:", e);
        throw new Error('Invalid base64 data in file');
      }
    } else {
      console.error("No file_data available in contact record");
    }

    // Set up the email content
    const emailContent = `
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
    </ul>
  </div>
  
  <p>Please check the Supabase dashboard for more details and to process this submission.</p>
  
  <p>You can process this submission using the following URL:</p>
  <code style="display: block; background: #f5f5f5; padding: 10px; margin: 10px 0; border-radius: 5px; font-size: 12px;">
    ${Deno.env.get('SUPABASE_URL')}/functions/v1/process-addresses?action=approve_processing&contact_id=${contact.id}
  </code>
  
  <p style="text-align: center; font-size: 12px; color: #666; margin-top: 20px;">
    This is an automated message from lintels.in
  </p>
</div>
    `;

    // Configure SendGrid
    sgMail.setApiKey(Deno.env.get('SENDGRID_API_KEY')!);

    // Prepare the email message with attachment
    const msg: any = {
      to: 'jamie@lintels.in',
      from: 'notifications@lintels.in',
      subject: `New Form Submission from ${contact.full_name}`,
      html: emailContent,
      text: `
New form submission:

Name: ${contact.full_name}
Email: ${contact.email}
Phone: ${contact.phone}
Company: ${contact.company}
Position: ${contact.position || 'Not provided'}
      `,
    };

    // Add attachment if we have valid file content
    if (fileContent && fileContent.length > 0) {
      console.log(`Adding attachment: ${fileName}`);
      
      msg.attachments = [
        {
          content: fileContent,
          filename: fileName,
          type: fileType,
          disposition: 'attachment',
        },
      ];
      
      // Log attachment details for debugging
      console.log("Attachment details:", {
        filename: fileName,
        type: fileType,
        contentLength: fileContent.length,
        contentSample: fileContent.substring(0, 20) + '...'
      });
    } else {
      console.warn("No valid file content to attach");
    }

    // Send email with retry logic
    const maxRetries = 3;
    let retryCount = 0;
    let lastError = null;
    
    while (retryCount <= maxRetries) {
      try {
        console.log(`Sending email${retryCount > 0 ? ` (retry ${retryCount})` : ''}`);
        const [response] = await sgMail.send(msg);
        
        console.log("Email sent successfully:", {
          statusCode: response.statusCode,
          headers: response.headers,
          hasAttachment: !!msg.attachments
        });
        
        // Return success response
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: "Notification sent successfully", 
            withAttachment: !!msg.attachments 
          }), 
          { 
            status: 200, 
            headers: { 
              ...corsHeaders,
              "Content-Type": "application/json" 
            } 
          }
        );
      } catch (error) {
        lastError = error;
        console.error(`SendGrid error (attempt ${retryCount + 1}):`, error);
        
        // If we've reached max retries and we have an attachment, try without it
        if (retryCount === maxRetries - 1 && msg.attachments) {
          console.log("Trying final attempt without attachment");
          delete msg.attachments;
        }
        
        retryCount++;
        if (retryCount <= maxRetries) {
          // Short delay between retries
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }

    // If we're here, all retries failed
    return new Response(
      JSON.stringify({ 
        error: `Failed to send email after ${maxRetries} attempts: ${lastError?.message || 'Unknown error'}` 
      }), 
      { 
        status: 500, 
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
