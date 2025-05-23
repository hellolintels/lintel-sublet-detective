import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { sendEmail } from './utils/email-sender.ts';
import { processFileData } from './utils/file-processor.ts';
import { buildEmailContent } from './utils/email-builder.ts';

// CORS headers for browser requests
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
    console.log('📨 notify-admin function called');

    // Parse the request body
    const requestData = await req.text();
    let payload;
    
    try {
      payload = JSON.parse(requestData);
      console.log('Request payload received:', JSON.stringify(payload, null, 2));
    } catch (jsonError) {
      console.error('Failed to parse JSON payload:', jsonError);
      console.log('Raw payload received:', requestData);
      throw new Error('Invalid JSON payload received');
    }

    // Validate required fields
    if (!payload.full_name || !payload.email || !payload.storagePath) {
      console.error('Missing required fields in request payload');
      throw new Error('Missing required fields: full_name, email, and storagePath are required');
    }

    // Initialize Supabase client with service role key
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Missing Supabase configuration in environment variables');
      throw new Error('Server configuration error: Missing database connection details');
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    console.log('Supabase client initialized with service role');

    // Check if this is an access request
    const isAccessRequest = payload.storagePath === "public/access-request.txt" || 
                           payload.full_name === "Access Request";
    
    // Check if this is a bypass mode submission
    const isBypassMode = payload.bypass_api_processing === true;
    
    // For access requests, we want to keep the company as the user provided
    // Otherwise, for normal access requests, we'll use the provided company field
    const company = isAccessRequest ? payload.email : (payload.company || "");
    
    console.log(`Company field: "${company}" (Is access request: ${isAccessRequest}, Is bypass mode: ${isBypassMode})`);

    // 1. Record the submission in pending_submissions table
    try {
      console.log('Inserting submission into pending_submissions table...');
      
      // Set status based on bypass mode
      const submissionStatus = isBypassMode ? 'submission_received' : 'pending';
      
      const submissionData = {
        full_name: payload.full_name,
        email: payload.email,
        company: company,
        position: payload.position || null,
        phone: payload.phone || null,
        storage_path: payload.storagePath,
        status: submissionStatus,
        updated_at: new Date().toISOString(),
      };
      
      console.log('Submission data being inserted:', JSON.stringify(submissionData, null, 2));
      
      const { data: insertData, error: insertError } = await supabaseAdmin
        .from('pending_submissions')
        .insert([submissionData])
        .select('id');

      if (insertError) {
        console.error('Error inserting into pending_submissions:', insertError);
        throw new Error(`Failed to record submission: ${insertError.message}`);
      }

      if (!insertData || insertData.length === 0) {
        console.error('No data returned from insert operation');
        throw new Error('Failed to record submission: No data returned from database');
      }

      console.log('Submission recorded successfully with ID:', insertData[0].id);
      
      // 2. Download the file from storage if needed
      let fileContent = '';
      let fileType = 'text/csv';
      let fileName = `addresses_${insertData[0].id}.csv`;
      
      // Only try to download if we have a storage path
      if (payload.storagePath && !isAccessRequest) {
        try {
          console.log(`Attempting to download file from storage: ${payload.storagePath}`);
          
          const { data: fileData, error: fileError } = await supabaseAdmin
            .storage
            .from('pending-uploads')
            .download(payload.storagePath);

          if (fileError) {
            console.error('Error downloading file:', fileError);
            // Continue with notification even if file download fails
            fileContent = `Error downloading file: ${fileError.message}`;
          } else if (fileData) {
            // Process file data into text
            fileContent = await fileData.text();
            fileName = payload.storagePath.split('/').pop() || fileName;
            console.log(`File downloaded successfully, size: ${fileContent.length} bytes`);
            console.log(`File content sample: ${fileContent.substring(0, 200)}`);
          }
        } catch (downloadError) {
          console.error('Exception during file download:', downloadError);
          fileContent = `Error processing file: ${downloadError.message || 'Unknown error'}`;
        }
      } else if (isAccessRequest) {
        // For access requests, we create a simple text file
        fileContent = `Access request from: ${payload.email}\nTime: ${new Date().toISOString()}`;
        fileName = "access_request.txt";
        console.log("Created access request content");
      }

      // 3. Send email notification to admin
      const adminEmail = Deno.env.get('APPROVER_EMAIL') || 'jamie@lintels.in';
      const submissionId = insertData[0].id;
      
      // Create a contact object to pass to the email builder
      const contact = {
        id: submissionId,
        full_name: payload.full_name,
        position: payload.position || '',
        company: company, // Use our processed company value
        email: payload.email,
        phone: payload.phone || '',
        form_type: payload.form_type || 'sample',
        file_name: fileName,
        file_type: fileType,
        bypass_api_processing: isBypassMode
      };
      
      console.log('Contact object for email:', JSON.stringify(contact, null, 2));
      
      // Build email content with bypass mode consideration
      const htmlContent = buildEmailContent(contact);
      
      // Plain text version with bypass mode note
      const plainText = isBypassMode 
        ? `MANUAL REVIEW REQUIRED: New submission from ${payload.full_name} (${payload.email}) - ${company || ''}. API processing bypassed - manual review needed.`
        : `New submission from ${payload.full_name} (${payload.email}) - ${company || ''}. Please review the attached file.`;
      
      // Send email notification
      console.log(`Sending email notification to ${adminEmail}...`);
      
      // Process the file content for cleaner email attachment
      const base64Content = processFileData(fileContent);
      console.log(`Processed base64 content length: ${base64Content.length}`);
      
      const emailSubject = isBypassMode 
        ? `[MANUAL REVIEW] ${isAccessRequest ? 'Access Request' : 'Address Submission'} from ${payload.full_name}`
        : `New ${isAccessRequest ? 'Access Request' : 'Address Submission'} from ${payload.full_name}`;
      
      const emailResult = await sendEmail(
        adminEmail,
        emailSubject,
        htmlContent,
        plainText,
        {
          content: base64Content,
          filename: fileName,
          contentType: fileType
        }
      );
      
      console.log('Email sending result:', emailResult);

      // 4. Return success response with additional information for debugging
      return new Response(
        JSON.stringify({
          success: true,
          message: isBypassMode ? 'Admin notification sent - manual review required' : 'Admin notification sent',
          submissionId: submissionId,
          emailSent: emailResult.success,
          emailMessage: emailResult.message,
          bypassMode: isBypassMode
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );

    } catch (dbError) {
      console.error('ERROR in notify-admin function:', dbError);
      console.error('Error inserting into pending_submissions:', dbError);
      
      return new Response(
        JSON.stringify({
          error: `Database error: ${dbError.message || 'Unknown database error'}`,
          details: dbError
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
  } catch (err) {
    console.error('❌ ERROR in notify-admin function:', err);
    
    return new Response(
      JSON.stringify({
        error: err.message || 'Internal server error',
        timestamp: new Date().toISOString()
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
