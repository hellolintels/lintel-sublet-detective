
import { serve } from 'https://deno.land/x/sift@0.6.0/mod.ts';
import { getContactById } from './utils/contacts.ts';
import { buildEmailContent } from './utils/email-builder.ts';
import { sendEmail } from './utils/email-sender.ts';
import { processFileData } from './utils/file-processor.ts';
import { corsHeaders } from './utils/cors.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  // Handle CORS preflight requests - this is crucial for browser-based requests
  if (req.method === 'OPTIONS') {
    console.log('Handling OPTIONS preflight request');
    return new Response(null, { 
      status: 204, // No content for OPTIONS
      headers: corsHeaders 
    });
  }
  
  try {
    console.log('📨 notify-admin function called with method:', req.method);
    
    // Parse the request body
    const body = await req.json();
    const { contactId } = body;

    console.log(`📝 Processing contact ID: ${contactId}`);
    
    if (!contactId) {
      throw new Error("Contact ID is required");
    }

    // Get contact data from Supabase
    const contact = await getContactById(contactId);
    
    // Process the file data to ensure proper encoding as plain text
    const fileContent = processFileData(contact.file_data);
    if (!fileContent) {
      throw new Error("Failed to process file data");
    }
    
    // Generate absolute approval/rejection URLs with full domain
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const approveUrl = `${supabaseUrl}/functions/v1/process-addresses?action=approve_processing&contact_id=${contactId}`;
    const rejectUrl = `${supabaseUrl}/functions/v1/process-addresses?action=reject_processing&contact_id=${contactId}`;
    
    // Build the email HTML body with approve/reject buttons
    const htmlContent = buildEmailContent(contact);
    
    // Plain text version of the email with direct links
    const textContent = `
New address list submission from ${contact.full_name} (${contact.email})
File: ${contact.file_name}
Contact ID: ${contactId}

To approve this submission, go to:
${approveUrl}

To reject this submission, go to:
${rejectUrl}

Contact Details:
- Full Name: ${contact.full_name}
- Email: ${contact.email}
- Phone: ${contact.phone}
- Company: ${contact.company || 'Not provided'}
- Position: ${contact.position || 'Not provided'}
    `;
    
    // Send the email with the CSV file as a plain text attachment
    const emailResult = await sendEmail(
      'jamie@lintels.in',
      `[ACTION REQUIRED] New Address List from ${contact.full_name} - ID: ${contactId}`,
      htmlContent,
      textContent,
      fileContent,
      contact.file_name,
      contact.file_type || 'text/csv'
    );
    
    if (!emailResult.success) {
      throw new Error(`Failed to send email: ${emailResult.message}`);
    }
    
    // Update contact status to "pending_approval"
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    
    const { error: updateError } = await supabase
      .from('contacts')
      .update({ status: 'pending_approval' })
      .eq('id', contactId);
      
    if (updateError) {
      console.error('Error updating contact status:', updateError);
    } else {
      console.log(`Contact status updated to "pending_approval" for ID: ${contactId}`);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Email sent to jamie@lintels.in with attachment: ${contact.file_name}`,
        emailFile: contact.file_name,
        contactStatus: 'pending_approval'
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
