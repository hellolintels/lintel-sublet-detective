
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

export function buildAdminEmailContent(data: EmailNotificationData): { subject: string; body: string } {
  const emailSubject = `[Lintels] New ${data.form_type} Request - ${data.company}`;
  const emailBody = `
    <h2>New Contact Form Submission</h2>
    <p><strong>Name:</strong> ${data.full_name}</p>
    <p><strong>Email:</strong> ${data.email}</p>
    <p><strong>Company:</strong> ${data.company}</p>
    <p><strong>Position:</strong> ${data.position}</p>
    <p><strong>Phone:</strong> ${data.phone}</p>
    <p><strong>Organization Type:</strong> ${data.organization_type}</p>
    ${data.organization_other ? `<p><strong>Organization Details:</strong> ${data.organization_other}</p>` : ''}
    <p><strong>Form Type:</strong> ${data.form_type}</p>
    <p><strong>File:</strong> ${data.file_name}</p>
    <p><strong>File Path:</strong> ${data.storagePath}</p>
    <p><strong>Contact ID:</strong> ${data.contactId}</p>
    
    <p>Please review this submission in the admin dashboard.</p>
  `;

  return { subject: emailSubject, body: emailBody };
}

export async function sendAdminNotification(supabase: any, data: EmailNotificationData): Promise<boolean> {
  const adminEmail = Deno.env.get('APPROVER_EMAIL') || 'jamie@lintels.in';
  const { subject, body } = buildAdminEmailContent(data);

  try {
    const { error: emailError } = await supabase.functions.invoke('send-email', {
      body: {
        to: adminEmail,
        subject: subject,
        html: body
      }
    });

    if (emailError) {
      console.error('Email sending error:', emailError);
      return false;
    }

    return true;
  } catch (emailErr) {
    console.error('Email function error:', emailErr);
    return false;
  }
}
