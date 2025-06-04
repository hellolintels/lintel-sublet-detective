import { sendEmail } from '../_shared/email.ts';
import { buildAdminNotificationEmail } from '../_shared/email-builder.ts';
import { downloadFileContent } from '../_shared/storage.ts';

export interface EmailNotificationData {
  full_name: string;
  email: string;
  company: string;
  position: string;
  phone: string;
  organization_type: string;
  organization_other?: string;
  form_type: string;
  file_name?: string;
  storagePath: string;
  contactId: string;
}

export async function sendAdminNotification(supabase: any, data: EmailNotificationData): Promise<boolean> {
  const adminEmail = Deno.env.get('APPROVER_EMAIL') || 'jamie@lintels.in';
  
  try {
    console.log(`Sending admin notification email to: ${adminEmail}`);
    
    // Build the proper admin notification email with approval buttons
    const emailSubject = `[Lintels] New ${data.form_type} Request - ${data.company}`;
    const emailBody = buildAdminNotificationEmail({
      id: data.contactId,
      full_name: data.full_name,
      email: data.email,
      company: data.company,
      position: data.position,
      phone: data.phone,
      organization_type: data.organization_type,
      organization_other: data.organization_other,
      form_type: data.form_type,
      file_name: data.file_name,
      file_type: data.file_name ? (data.file_name.toLowerCase().endsWith('.xlsx') ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 'text/csv') : 'text/csv'
    });
    
    console.log(`Subject: ${emailSubject}`);
    
    // Download the file from storage to attach it to the email
    let attachment = undefined;
    if (data.file_name && data.storagePath) {
      try {
        console.log(`Downloading file for attachment: ${data.storagePath}`);
        const fileData = await downloadFileContent('pending-uploads', data.storagePath);
        
        attachment = {
          content: fileData.content,
          filename: data.file_name,
          contentType: fileData.contentType
        };
        
        console.log(`File attachment prepared: ${data.file_name}, binary: ${fileData.isBinary}, type: ${fileData.contentType}`);
      } catch (attachmentError) {
        console.error('Failed to download file for attachment:', attachmentError);
        // Continue without attachment but log the error
      }
    }
    
    const emailResult = await sendEmail(
      adminEmail, 
      emailSubject, 
      emailBody,
      undefined, // textContent
      attachment
    );
    
    if (!emailResult.success) {
      console.error('Email sending failed:', emailResult.message);
      return false;
    }

    console.log(`Admin notification email sent successfully to: ${adminEmail}`);
    return true;
  } catch (emailErr) {
    console.error('Email function error:', emailErr);
    return false;
  }
}
