
export function buildEmailContent(contact) {
  const isBypassMode = contact.bypass_api_processing === true;
  const approveUrl = `https://lintels.in/approve-processing?action=approve&id=${contact.id}`;
  const rejectUrl = `https://lintels.in/approve-processing?action=reject&id=${contact.id}`;

  const statusAlert = isBypassMode 
    ? `<div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; margin: 20px 0; border-radius: 4px;">
         <strong>⚠️ MANUAL REVIEW REQUIRED</strong><br>
         API processing has been bypassed due to system maintenance. This submission requires manual review and processing.
       </div>`
    : '';

  const actionButtons = isBypassMode 
    ? `<div style="margin: 20px 0;">
         <strong>📋 Manual Review Required</strong>
         <p>Please review this submission manually. Do not use the automatic processing buttons until system maintenance is complete.</p>
         <p style="color: #856404; background-color: #fff3cd; padding: 10px; border-radius: 4px;">
           <strong>Note:</strong> ScrapingBee API and other automated processing services are currently under maintenance.
         </p>
       </div>`
    : `<div style="margin: 20px 0;">
         <strong>✅ Suggested Actions</strong>
         <p>Please review the attached CSV file and approve or reject this submission:</p>
         <a href="${approveUrl}" style="display: inline-block; background-color: #F97316; color: white; padding: 10px 20px; margin-right: 10px; text-decoration: none; border-radius: 4px;">✅ Approve</a>
         <a href="${rejectUrl}" style="display: inline-block; background-color: #000000; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">❌ Reject</a>
       </div>`;

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #d3d3d3; border-radius: 5px;">
      <h2 style="color: #F97316; text-align: center;">${isBypassMode ? 'Manual Review Required - ' : ''}New Address Submission</h2>

      ${statusAlert}

      <h3>📄 User Details</h3>
      <ul>
        <li><strong>Full Name:</strong> ${contact.full_name}</li>
        <li><strong>Position:</strong> ${contact.position || 'Not provided'}</li>
        <li><strong>Company:</strong> ${contact.company || 'Not provided'}</li>
        <li><strong>Email:</strong> ${contact.email}</li>
        <li><strong>Phone:</strong> ${contact.phone}</li>
        <li><strong>Form Type:</strong> ${contact.form_type || 'sample'}</li>
      </ul>

      <h3>📁 File Information</h3>
      <ul>
        <li><strong>File Name:</strong> ${contact.file_name}</li>
        <li><strong>File Type:</strong> ${contact.file_type}</li>
      </ul>

      ${actionButtons}

      <p style="font-size: 12px; color: #666;">This is an automated message from Lintels.in</p>
    </div>
  `;
}
