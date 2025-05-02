
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

    // Prepare file attachment for SendGrid
    let fileAttachment = null;
    if (contact.file_data) {
      console.log("Contact has file data, preparing attachment");
      const fileName = contact.file_name || `addresses_${contactId}.csv`;
      const fileType = contact.file_type || 'text/csv';
      
      // Get the file data - this is crucial for attachments
      let fileData = contact.file_data;
      
      // Handle bytea from Postgres - if it's starting with \x, it's a hex representation
      if (typeof fileData === 'string' && fileData.startsWith('\\x')) {
        console.log("Converting hex-encoded bytea to base64");
        
        // Remove the \x prefix and convert hex to base64
        const hexString = fileData.substring(2);
        
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
        fileData = btoa(binaryString);
        console.log("Converted hex bytea to base64, length:", fileData.length);
      }
      // If data is already base64 but has prefix, remove it
      else if (typeof fileData === 'string' && fileData.includes('base64,')) {
        fileData = fileData.split('base64,')[1];
        console.log("Removed base64 prefix from file data");
      }
      // If it's binary data, convert to base64
      else if (fileData instanceof Uint8Array) {
        let binaryString = '';
        for (let i = 0; i < fileData.length; i++) {
          binaryString += String.fromCharCode(fileData[i]);
        }
        fileData = btoa(binaryString);
        console.log("Converted binary data to base64, length:", fileData.length);
      }

      // Clean up the base64 string to ensure it only contains valid base64 characters
      if (typeof fileData === 'string') {
        fileData = fileData.replace(/[^A-Za-z0-9+/=]/g, '');
        
        console.log(`Prepared file attachment: ${fileName} (${fileType})`);
        console.log(`File data length: ${fileData.length} characters`);
        console.log(`File data preview: ${fileData.substring(0, 20)}...`);
        
        // Verify this is valid base64
        try {
          // Test decode a small sample
          atob(fileData.substring(0, 10));
          
          fileAttachment = {
            content: fileData,
            filename: fileName,
            type: fileType,
            disposition: "attachment",
          };
          console.log("Valid base64 attachment created");
        } catch (e) {
          console.error("Invalid base64 data detected:", e);
          fileAttachment = null;
        }
      } else {
        console.error("File data is not in expected format:", typeof fileData);
      }
    } else {
      console.log("No file data available in contact record");
    }

    console.log(`Sending email notification to admin...`);
    sgMail.setApiKey(Deno.env.get('SENDGRID_API_KEY')!);

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
      html: `
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
      `,
    };
    
    // Add attachment if available
    if (fileAttachment) {
      msg.attachments = [fileAttachment];
      console.log("Added file attachment to email");
      console.log("Attachment filename:", fileAttachment.filename);
      console.log("Attachment content length:", fileAttachment.content.length);
      // Console log first few characters of content for debugging
      console.log("Attachment content preview:", fileAttachment.content.substring(0, 20) + "...");
    }

    // Implement retry logic for SendGrid API
    const maxRetries = 3;
    let retryCount = 0;
    let lastError = null;
    let sendSuccess = false;
    
    while (retryCount <= maxRetries && !sendSuccess) {
      try {
        if (retryCount > 0) {
          console.log(`Retry attempt ${retryCount} of ${maxRetries}...`);
          if (retryCount === maxRetries && fileAttachment) {
            console.log("Last retry - removing attachment to increase chances of success");
            delete msg.attachments;
          }
        }
        
        const response = await sgMail.send(msg);
        console.log("SendGrid API response:", response);
        sendSuccess = true;
        break;
      } catch (sendGridError) {
        lastError = sendGridError;
        console.error(`SendGrid API error (attempt ${retryCount + 1}):`, sendGridError);
        retryCount++;
        
        // Short delay between retries, increasing with each attempt
        if (retryCount <= maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 500 * retryCount));
        }
      }
    }
    
    // If all retries failed
    if (!sendSuccess) {
      console.error("All SendGrid attempts failed, sending simplified email without attachment");
      try {
        // Final attempt without any attachment
        delete msg.attachments;
        const response = await sgMail.send(msg);
        console.log("Final simplified email sent:", response);
        sendSuccess = true;
      } catch (finalError) {
        console.error("Even simplified email failed:", finalError);
        throw new Error("Failed to send email notification after multiple attempts");
      }
    }

    return new Response(
      JSON.stringify({ success: true, message: "Notification sent successfully", withAttachment: !!fileAttachment && sendSuccess }), 
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
