
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

    const { data: contact, error } = await supabase
      .from('contacts')
      .select('*')
      .eq('id', contactId)
      .single();

    if (error || !contact) {
      console.error("Contact not found:", error);
      throw new Error('Contact not found');
    }
    
    console.log(`Found contact: ${contact.full_name}`);
    
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
      <li><strong>File Name:</strong> ${contact.file_name || 'Not provided'}</li>
      <li><strong>File Type:</strong> ${contact.file_type || 'Not provided'}</li>
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

    // Prepare the SendGrid message object
    const msg = {
      to: 'jamie@lintels.in',
      from: 'noreply@lintels.in',
      subject: `New Form Submission from ${contact.full_name}`,
      text: `
New form submission:

Name: ${contact.full_name}
Email: ${contact.email}
Phone: ${contact.phone}
Company: ${contact.company}
Position: ${contact.position}
Form Type: ${contact.form_type}
      `,
      html: emailContent,
    };
    
    // Handle file attachment
    if (contact.file_data) {
      console.log("Contact has file data, preparing attachment");
      const fileName = contact.file_name || `addresses_${contactId}.csv`;
      const fileType = contact.file_type || 'text/csv';
      
      // Process the file_data based on its format
      let fileContent = '';
      
      // If file_data is a bytea from Postgres (starts with \x), convert it properly
      if (typeof contact.file_data === 'string' && contact.file_data.startsWith('\\x')) {
        console.log("Converting hex-encoded bytea to base64");
        
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
        console.log("Base64 sample:", fileContent.substring(0, 30) + "...");
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
      }
      
      // Clean up the base64 string to ensure it only contains valid base64 characters
      fileContent = fileContent.replace(/[^A-Za-z0-9+/=]/g, '');
      
      // Validate the base64 content before attaching
      try {
        // Test decode a small sample to verify it's valid base64
        atob(fileContent.substring(0, 10));
        
        // Add attachment to the email
        msg.attachments = [{
          content: fileContent,
          filename: fileName,
          type: fileType,
          disposition: "attachment"
        }];
        
        console.log("File attachment prepared successfully");
        console.log("Attachment details:", {
          filename: fileName,
          type: fileType,
          contentLength: fileContent.length,
          contentSample: fileContent.substring(0, 20) + "..."
        });
      } catch (e) {
        console.error("Invalid base64 data, cannot attach file:", e);
      }
    } else {
      console.log("No file_data available in contact record");
    }

    // Send the email with retry logic
    sgMail.setApiKey(Deno.env.get('SENDGRID_API_KEY')!);
    
    const maxRetries = 3;
    let retryCount = 0;
    let lastError = null;
    let sendSuccess = false;
    
    while (retryCount <= maxRetries && !sendSuccess) {
      try {
        if (retryCount > 0) {
          console.log(`Retry attempt ${retryCount} of ${maxRetries}...`);
        }
        
        const response = await sgMail.send(msg);
        console.log("SendGrid API response:", response);
        sendSuccess = true;
      } catch (sendGridError) {
        lastError = sendGridError;
        console.error(`SendGrid API error (attempt ${retryCount + 1}):`, sendGridError);
        retryCount++;
        
        // If last retry and still failing, try without attachment
        if (retryCount === maxRetries && msg.attachments) {
          console.log("All attachment retries failed, trying without attachment");
          delete msg.attachments;
        } else if (retryCount <= maxRetries) {
          // Short delay between retries, increasing with each attempt
          await new Promise(resolve => setTimeout(resolve, 500 * retryCount));
        }
      }
    }
    
    // If all retries failed
    if (!sendSuccess && lastError) {
      console.error("All SendGrid attempts failed");
      throw new Error(`Failed to send email: ${lastError.message}`);
    }

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
