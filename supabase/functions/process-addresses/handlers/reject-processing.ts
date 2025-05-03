
// Handler for rejecting address processing

export async function handleRejectProcessing(contactId: string, corsHeaders: Record<string, string>) {
  console.log(`🚫 Rejecting processing for contact ID: ${contactId}`);
  
  try {
    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase credentials not configured');
    }
    
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Update contact status to rejected
    const { error: updateError } = await supabase
      .from('contacts')
      .update({ status: 'rejected' })
      .eq('id', contactId);
      
    if (updateError) {
      console.error('Error updating contact status to rejected:', updateError);
      throw new Error(`Failed to update contact status: ${updateError.message}`);
    }
    
    console.log(`✅ Contact ID ${contactId} marked as rejected successfully`);
    
    // Return HTML response confirming rejection
    const htmlResponse = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Processing Rejected</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 40px;
            line-height: 1.6;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            border: 1px solid #ddd;
            border-radius: 5px;
            background-color: #f9f9f9;
          }
          h1 {
            color: #d9534f;
          }
          .footer {
            margin-top: 30px;
            font-size: 0.9em;
            color: #777;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Address Processing Rejected</h1>
          <p>You have successfully rejected the processing of the address list (ID: ${contactId}).</p>
          <p>The submission has been marked as rejected in the system and no further processing will occur.</p>
          <p>You can safely close this window.</p>
          <div class="footer">
            <p>lintels.in - Property Sublet Detection</p>
          </div>
        </div>
      </body>
      </html>
    `;
    
    return new Response(htmlResponse, {
      status: 200,
      headers: { 
        ...corsHeaders,
        'Content-Type': 'text/html' 
      }
    });
    
  } catch (error) {
    console.error('Error in rejection process:', error);
    
    // Return error page
    const errorHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Error</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 40px;
            line-height: 1.6;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            border: 1px solid #ddd;
            border-radius: 5px;
            background-color: #f9f9f9;
          }
          h1 {
            color: #d9534f;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Error</h1>
          <p>Failed to process rejection: ${error.message}</p>
          <p>Please contact the system administrator.</p>
        </div>
      </body>
      </html>
    `;
    
    return new Response(errorHtml, {
      status: 500,
      headers: { 
        ...corsHeaders,
        'Content-Type': 'text/html' 
      }
    });
  }
}
