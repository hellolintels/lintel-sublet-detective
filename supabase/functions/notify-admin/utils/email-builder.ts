
/**
 * Builds the HTML content for the admin notification email
 * @param contact The contact data to include in the email
 * @returns HTML string for the email
 */
export function buildEmailContent(contact: any): string {
  return `
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
      <li><strong>File Name:</strong> ${contact.file_name || `addresses_${contact.id}.csv`}</li>
      <li><strong>File Type:</strong> ${contact.file_type || 'text/csv'}</li>
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
}
