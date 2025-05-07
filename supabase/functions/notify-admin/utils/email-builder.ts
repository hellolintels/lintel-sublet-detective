/**
 * Builds the HTML content for the admin notification email
 * @param contact The contact data to include in the email
 * @returns HTML string for the email
 */
export function buildEmailContent(contact: any): string {
 const approveUrl = `https://lintels.in/approve-processing?action=approve_processing&contact_id=${contact.id}`;
const rejectUrl = `https://lintels.in/reject-processing?action=reject_processing&contact_id=${contact.id}`;

  
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
  
  <div style="margin: 20px 0;">
    <p><strong>Actions Required:</strong></p>
    <p>Please review the attached CSV file and approve or reject this submission:</p>
    
    <div style="margin: 20px 0;">
      <a href="${approveUrl}" style="display: inline-block; background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; margin-right: 10px;">Approve Processing</a>
      <a href="${rejectUrl}" style="display: inline-block; background-color: #f44336; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">Reject</a>
    </div>
    
    <p style="font-size: 12px; color: #666;">
      Approving will process the addresses through BrightData and create a sample report.<br>
      Rejecting will mark the submission as rejected in the database.
    </p>
  </div>
  
  <p style="text-align: center; font-size: 12px; color: #666; margin-top: 20px;">
    This is an automated message from lintels.in
  </p>
</div>
  `;
}
