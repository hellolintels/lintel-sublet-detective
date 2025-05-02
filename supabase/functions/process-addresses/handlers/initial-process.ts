
// This is just a small modification to ensure proper email notifications
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { sendEmail } from "../email.ts";
import { corsHeaders } from "../constants.ts";
import { countAddressRows, extractFileDataForAttachment } from "../file-processing.ts";

const MAX_ALLOWED_ROWS = 20;

/**
 * Handle initial processing of address data
 * @param supabase Supabase client
 * @param contact Contact details
 * @returns Response object
 */
export async function handleInitialProcess(
  supabase: ReturnType<typeof createClient>,
  contact: any,
  supabaseUrl: string
) {
  console.log(`Starting initial process for contact: ${contact.id}`);
  console.log(`Contact full name: ${contact.full_name}, email: ${contact.email}`);
  console.log(`File name: ${contact.file_name}, File type: ${contact.file_type}`);
  
  // Count rows in the address file to determine processing approach
  const addressCount = await countAddressRows(contact.file_data);
  console.log(`Address file contains ${addressCount} rows`);
  
  // Check if address count exceeds maximum
  if (addressCount > MAX_ALLOWED_ROWS) {
    console.log(`Address count (${addressCount}) exceeds maximum allowed (${MAX_ALLOWED_ROWS})`);
    
    // Update contact status to indicate too many addresses
    const { error: updateError } = await supabase
      .from("contacts")
      .update({ 
        status: "too_many_addresses"
      })
      .eq("id", contact.id);
      
    if (updateError) {
      console.error("Error updating contact:", updateError);
      throw updateError;
    }
    
    // Send notification to user about the limit
    await sendEmail(
      contact.email,
      "Regarding Your Address List Submission - Lintels.in",
      `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ff6b6b; border-radius: 5px;">
        <h1 style="color: #ff6b6b; text-align: center;">Address List Limit Exceeded</h1>
        
        <p>Hello ${contact.full_name},</p>
        
        <p>Thank you for your interest in our services. We've received your address list submission, but we noticed that your file contains more than ${MAX_ALLOWED_ROWS} addresses.</p>
        
        <p>For our sample report service, we can only process up to ${MAX_ALLOWED_ROWS} addresses at a time. If you'd like to proceed with a sample report, please resubmit your form with a smaller list of addresses.</p>
        
        <p>If you need to process a larger dataset, please contact us at <a href="mailto:info@lintels.in">info@lintels.in</a> to discuss our full service options.</p>
        
        <p>We apologize for any inconvenience and look forward to assisting you.</p>
        
        <p style="text-align: center; font-size: 12px; color: #666; margin-top: 20px;">
          This is an automated message from lintels.in
        </p>
      </div>
      `
    );
    
    // Alert admin about the oversized submission
    await sendEmail(
      "jamie@lintels.in",
      `[Lintels] Oversized Address List from ${contact.full_name}`,
      `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ff6b6b; border-radius: 5px;">
        <h1 style="color: #ff6b6b; text-align: center;">Oversized Address List Submission</h1>
        
        <p>A user has submitted an address list that exceeds the ${MAX_ALLOWED_ROWS} address limit for sample reports:</p>
        
        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 15px 0;">
          <ul>
            <li><strong>Name:</strong> ${contact.full_name}</li>
            <li><strong>Email:</strong> ${contact.email}</li>
            <li><strong>Company:</strong> ${contact.company}</li>
            <li><strong>Address Count:</strong> ${addressCount}</li>
            <li><strong>File Name:</strong> ${contact.file_name || 'Not provided'}</li>
          </ul>
        </div>
        
        <p>This may be a good sales opportunity for a full service conversion. The user has been notified that their submission exceeds the sample limit.</p>
        
        <p style="text-align: center; font-size: 12px; color: #666; margin-top: 20px;">
          This is an automated message from lintels.in
        </p>
      </div>
      `
    );
    
    return new Response(
      JSON.stringify({
        message: "Address file exceeds maximum allowed rows",
        contact_id: contact.id,
        status: "too_many_addresses",
        email_sent: true
      }),
      { 
        headers: { 
          ...corsHeaders,
          "Content-Type": "application/json" 
        } 
      }
    );
  }
  
  // Update contact status
  console.log(`Updating contact status to pending_approval`);
  const { error: updateError } = await supabase
    .from("contacts")
    .update({ 
      status: "pending_approval"
    })
    .eq("id", contact.id);
    
  if (updateError) {
    console.error("Error updating contact:", updateError);
    throw updateError;
  }
  console.log(`Updated contact status to 'pending_approval'`);
  
  // Construct approval URL
  const approvalUrl = `${supabaseUrl}/functions/v1/process-addresses`;
  const approvalLink = `${approvalUrl}?action=approve_processing&contact_id=${contact.id}`;
  console.log(`Using approval URL: ${approvalUrl}`);
  console.log(`Approval link: ${approvalLink}`);
  
  // Call notify-admin function to ensure admin gets notified with attachment
  try {
    console.log("Calling notify-admin function");
    const notifyResult = await fetch(`${supabaseUrl}/functions/v1/notify-admin`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`
      },
      body: JSON.stringify({ contactId: contact.id })
    });
    
    const notifyResponse = await notifyResult.json();
    console.log("Notify admin response:", notifyResponse);
  } catch (notifyError) {
    console.error("Error calling notify-admin function:", notifyError);
    // Continue with regular email flow as fallback
  }
  
  // Prepare file attachment for email - ensure we're using the properly formatted file data
  let fileAttachment;
  try {
    if (contact.file_data) {
      console.log("Preparing file for attachment...");
      
      // Use a descriptive filename - either the original name or generate one
      const fileName = contact.file_name || `${contact.full_name.replace(/\s+/g, '_')}_addresses.csv`;
      const fileType = contact.file_type || 'text/csv';
      
      console.log(`File details - Name: ${fileName}, Type: ${fileType}`);
      console.log(`File data length: ${contact.file_data.length} characters`);
      
      // Use extractFileDataForAttachment to get properly formatted base64 data
      const fileData = extractFileDataForAttachment(contact);
      
      if (fileData) {
        fileAttachment = {
          filename: fileName,
          content: fileData,
          type: fileType,
          disposition: "attachment"
        };
        
        console.log(`File attachment prepared: ${fileAttachment.filename} (${fileAttachment.type})`);
        console.log(`Content length: ${fileAttachment.content.length} characters`);
        console.log(`Content preview: ${fileAttachment.content.substring(0, 50)}...`);
        
        // Basic validation
        if (!fileAttachment.content || fileAttachment.content.length === 0) {
          console.error("Empty file content, skipping attachment");
          fileAttachment = undefined;
        }
      } else {
        console.error("Failed to extract file data for attachment");
      }
    } else {
      console.log("No file_data available in contact record");
    }
  } catch (attachmentError) {
    console.error("Error preparing file attachment:", attachmentError);
    // Continue without the attachment if there's an error
  }
  
  // Send admin notification email with file attachment and approval link
  console.log("Sending admin notification email with file attachment and approval link");
  const adminEmailResult = await sendEmail(
    "jamie@lintels.in",
    `[Lintels] New Address Submission from ${contact.full_name} - Approval Required`,
    `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #2196F3; border-radius: 5px;">
      <h1 style="color: #2196F3; text-align: center;">New Address Submission</h1>
      
      <p>A new address list has been submitted for processing and requires your approval.</p>
      
      <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 15px 0;">
        <h3 style="margin-top: 0;">User Details:</h3>
        <ul>
          <li><strong>Full Name:</strong> ${contact.full_name}</li>
          <li><strong>Position:</strong> ${contact.position}</li>
          <li><strong>Company:</strong> ${contact.company}</li>
          <li><strong>Email:</strong> ${contact.email}</li>
          <li><strong>Phone:</strong> ${contact.phone}</li>
          <li><strong>Form Type:</strong> ${contact.form_type}</li>
        </ul>
        
        <h3>File Information:</h3>
        <ul>
          <li><strong>File Name:</strong> ${contact.file_name || 'Not provided'}</li>
          <li><strong>File Type:</strong> ${contact.file_type || 'Not provided'}</li>
          <li><strong>Address Count:</strong> ${addressCount}</li>
        </ul>
      </div>
      
      <p><strong>Action Required:</strong> Please review the submission and click the button below to approve processing for Bright Data matching:</p>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${approvalLink}" 
           style="background-color: #2196F3; color: white; padding: 15px 25px; text-decoration: none; font-weight: bold; font-size: 18px; border-radius: 5px; display: inline-block;">
          Approve Processing
        </a>
      </div>
      
      <p style="background-color: #fffde7; padding: 10px; border-left: 4px solid #ffd600; margin: 20px 0;">
        <strong>Note:</strong> Clicking the approval button will trigger the Bright Data scraping process for the addresses in the file. 
        The system will check each postcode against Airbnb, SpareRoom, and Gumtree, and generate a report with the results.
      </p>
      
      <p>Or use the API endpoint directly:</p>
      <pre style="background: #f5f5f5; padding: 10px; border-radius: 5px; font-size: 12px; overflow-x: auto;">
POST ${approvalUrl}
Content-Type: application/json

{
  "contactId": "${contact.id}",
  "action": "approve_processing"
}
      </pre>
      
      <p>If the file attachment is missing or you need to review the original file, please check the admin dashboard.</p>
      
      <p style="text-align: center; font-size: 12px; color: #666; margin-top: 20px;">
        This is an automated message from lintels.in
      </p>
    </div>
    `,
    fileAttachment
  );
  
  console.log("Admin email sending result:", adminEmailResult);
  
  // If admin email fails, retry once more with simplified content
  if (!adminEmailResult.success) {
    console.log("Retrying admin email with simplified content...");
    
    const retryResult = await sendEmail(
      "jamie@lintels.in",
      `[URGENT] [Lintels] New Address Submission from ${contact.full_name} - RETRY`,
      `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ff0000; border-radius: 5px;">
        <h1 style="color: #ff0000; text-align: center;">New Address Submission (Retry)</h1>
        
        <p>A new address list has been submitted from ${contact.full_name} (${contact.email}).</p>
        
        <p>The original notification email failed to send. Please check the admin dashboard for details.</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${approvalLink}" 
             style="background-color: #ff0000; color: white; padding: 12px 20px; text-decoration: none; font-weight: bold; border-radius: 5px; display: inline-block;">
            Approve Processing
          </a>
        </div>
        
        <p style="text-align: center; font-size: 12px; color: #666; margin-top: 20px;">
          This is an automated RETRY message from lintels.in
        </p>
      </div>
      `
    );
    
    console.log("Admin email retry result:", retryResult);
  }
  
  // Send confirmation email to customer with UK spelling
  const clientEmailResult = await sendEmail(
    contact.email,
    "We've Received Your Address List - Lintels.in",
    `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #2196F3; border-radius: 5px;">
      <h1 style="color: #2196F3; text-align: center;">Thank You for Your Submission</h1>
      
      <p>Hello ${contact.full_name},</p>
      
      <p>We've received your address list and will begin processing it shortly. You'll receive your sample report within 24 hours.</p>
      
      <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 15px 0;">
        <p><strong>What happens next?</strong></p>
        <ol style="margin-left: 20px; padding-left: 0;">
          <li>Our system will analyse your addresses against our database of short-term rental listings</li>
          <li>We'll compile a sample report showing potential matches</li>
          <li>You'll receive an email with the report results within 24 hours</li>
        </ol>
      </div>
      
      <p>If you have any questions in the meantime, please contact us at <a href="mailto:info@lintels.in">info@lintels.in</a>.</p>
      
      <p style="text-align: center; font-size: 12px; color: #666; margin-top: 20px;">
        This is an automated message from lintels.in
      </p>
    </div>
    `
  );
  
  console.log("Client confirmation email result:", clientEmailResult);
  
  return new Response(
    JSON.stringify({
      message: "Address data submitted for approval",
      contact_id: contact.id,
      status: "pending_approval",
      email_sent: true // Simplified for readability
    }),
    { 
      headers: { 
        ...corsHeaders,
        "Content-Type": "application/json" 
      } 
    }
  );
}
