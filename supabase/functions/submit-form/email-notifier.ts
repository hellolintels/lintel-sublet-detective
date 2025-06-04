
import { sendEmail } from '../_shared/email.ts';
import { buildAdminNotificationEmail } from '../_shared/email-builder.ts';

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
      file_type: 'text/csv'
    });
    
    console.log(`Subject: ${emailSubject}`);
    
    const emailResult = await sendEmail(adminEmail, emailSubject, emailBody);
    
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
