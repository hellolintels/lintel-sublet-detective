
import { sendEmail } from '../../_shared/email.ts';

export async function sendClientNotification(contact: any, postcodes: any[], railwayResult: any) {
  await sendEmail(
    contact.email,
    `Your Property Report is Being Processed - ${contact.company}`,
    `
    <p>Hello ${contact.full_name},</p>
    <p>Great news! Your property matching report is now being processed using our advanced Railway system.</p>
    <p><strong>Processing Details:</strong></p>
    <ul>
      <li>Total Addresses: ${postcodes.length}</li>
      <li>Job ID: ${railwayResult.job_id || 'Processing'}</li>
      <li>Expected Completion: Within 2-4 hours</li>
      <li>Processing System: Railway API with enhanced matching</li>
    </ul>
    <p>Our system will automatically check Airbnb and SpareRoom for matching properties. You will receive an email with your complete report once processing is finished.</p>
    <p>Thank you for choosing Lintels.in!</p>
    <p>Best regards,<br>The Lintels Team</p>
    `
  );
}

export async function sendAdminNotification(contact: any, contactId: string, processingJobId: string, railwayResult: any, postcodes: any[]) {
  const adminEmail = Deno.env.get('APPROVER_EMAIL') || 'jamie@lintels.in';
  await sendEmail(
    adminEmail,
    `[Lintels] Railway Processing Started - ${contact.company}`,
    `
    <p>Hello,</p>
    <p>Railway processing has started for ${contact.full_name} from ${contact.company}.</p>
    <p><strong>Processing Details:</strong></p>
    <ul>
      <li>Contact ID: ${contactId}</li>
      <li>Processing Job ID: ${processingJobId}</li>
      <li>Railway Job ID: ${railwayResult.job_id || 'Processing'}</li>
      <li>Total Postcodes: ${postcodes.length}</li>
      <li>Contact Email: ${contact.email}</li>
      <li>Processing Method: Railway API</li>
      <li>Expected Completion: Within 2-4 hours</li>
    </ul>
    <p>The system will automatically process all postcodes and send the report to the client when complete.</p>
    `
  );
}
