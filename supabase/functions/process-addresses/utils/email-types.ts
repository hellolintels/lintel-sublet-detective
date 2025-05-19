
/**
 * Interface for email attachments
 */
export interface EmailAttachment {
  filename: string;
  content: string;  // Base64 encoded content
  contentType?: string;
  type?: string;
}

/**
 * Interface for email sending results
 */
export interface EmailSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
  recipient: string;
  subject: string;
  note?: string;
}
