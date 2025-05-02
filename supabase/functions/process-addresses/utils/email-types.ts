
/**
 * Email attachment interface
 */
export interface EmailAttachment {
  filename: string;
  content: string;
  type: string;
  disposition?: string;
}

/**
 * Email sending result interface
 */
export interface EmailSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
  recipient: string;
  subject: string;
  note?: string;
}
