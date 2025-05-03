
import { serve } from 'https://deno.land/x/sift@0.6.0/mod.ts';
import { getContactById } from './utils/contacts.ts';
import { sendEmail } from './utils/email-sender.ts';
import { processFileData } from './utils/file-processor.ts';
import { corsHeaders } from './utils/cors.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('Handling OPTIONS preflight request');
    return new Response(null, { 
      status: 204,
      headers: corsHeaders 
    });
  }
  
  try {
    console.log('📨 DIRECT EMAIL WORKAROUND: notify-admin function called with method:', req.method);
    
    // Parse the request body
    const body = await req.json();
    const { contactId } = body;

    console.log(`📝 Processing contact ID: ${contactId}`);
    
    if (!contactId) {
      throw new Error("Contact ID is required");
    }

    // Get contact data from Supabase
    const contact = await getContactById(contactId);
    console.log("Retrieved contact:", JSON.stringify({
      id: contact.id,
      name: contact.full_name,
      email: contact.email,
      file_name: contact.file_name,
      file_type: contact.file_type
    }));
    
    // Process the file data to ensure proper encoding as plain text
    const fileContent = processFileData(contact.file_data);
    if (!fileContent) {
      throw new Error("Failed to process file data");
    }
    console.log("Successfully processed file data, length:", fileContent.length);
    
    // Build email content with clearer formatting and critical information
    const htmlContent = `
      <h1>New Address List Submission</h1>
      <p>A new address list has been submitted by ${contact.full_name} (${contact.email}).</p>
      <h2>Contact Details:</h2>
      <ul>
        <li><strong>Full Name:</strong> ${contact.full_name}</li>
        <li><strong>Position:</strong> ${contact.position || 'Not provided'}</li>
        <li><strong>Company:</strong> ${contact.company || 'Not provided'}</li>
        <li><strong>Email:</strong> ${contact.email}</li>
        <li><strong>Phone:</strong> ${contact.phone}</li>
        <li><strong>Submission Time:</strong> ${new Date().toISOString()}</li>
        <li><strong>Contact ID:</strong> ${contactId}</li>
      </ul>
      <p>Please see the attached file for addresses.</p>
      <p><strong>IMPORTANT:</strong> This is a direct submission. No approval step is required.</p>
    `;
    
    // Plain text version of the email
    const textContent = `
URGENT: New address list submission from ${contact.full_name} (${contact.email})
File: ${contact.file_name}
Contact ID: ${contactId}
Submission Time: ${new Date().toISOString()}

Contact Details:
- Full Name: ${contact.full_name}
- Email: ${contact.email}
- Phone: ${contact.phone}
- Company: ${contact.company || 'Not provided'}
- Position: ${contact.position || 'Not provided'}

IMPORTANT: This is a direct submission. No approval step is required.
    `;
    
    console.log("Sending direct email to jamie@lintels.in");
    
    // Send the email with the CSV file as a plain text attachment
    const emailResult = await sendEmail(
      'jamie@lintels.in',
      `[URGENT SUBMISSION] Address List from ${contact.full_name}`,
      htmlContent,
      textContent,
      fileContent,
      contact.file_name,
      contact.file_type || 'text/csv'
    );
    
    if (!emailResult.success) {
      console.error("Email sending failed:", emailResult.message);
      throw new Error(`Failed to send email: ${emailResult.message}`);
    }
    
    console.log("Email successfully sent to jamie@lintels.in");
    
    // Update contact status to "submitted"
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    
    const { error: updateError } = await supabase
      .from('contacts')
      .update({ status: 'submitted' })
      .eq('id', contactId);
      
    if (updateError) {
      console.error('Error updating contact status:', updateError);
    } else {
      console.log(`Contact status updated to "submitted" for ID: ${contactId}`);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Email sent directly to jamie@lintels.in with attachment: ${contact.file_name}`,
        emailFile: contact.file_name,
        contactStatus: 'submitted',
        timestamp: new Date().toISOString()
      }), 
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  } catch (err) {
    console.error('❌ ERROR in notify-admin function:', err);
    
    // Send a fallback error notification email
    try {
      await sendEmail(
        'jamie@lintels.in',
        '[ERROR] Address List Submission Error',
        `<h1>Error Processing Address Submission</h1><p>There was an error processing a submission: ${err.message}</p>`,
        `Error Processing Address Submission: ${err.message}`,
        '',
        'error_log.txt',
        'text/plain'
      );
      console.log("Sent error notification email");
    } catch (emailErr) {
      console.error("Failed to send error notification:", emailErr);
    }
    
    return new Response(
      JSON.stringify({ 
        error: err.message,
        timestamp: new Date().toISOString()
      }), 
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
