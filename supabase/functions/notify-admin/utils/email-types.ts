
/**
 * Interface representing an email attachment
 */
export interface EmailAttachment {
  /** Base64-encoded content of the attachment */
  content: string;
  /** Filename for the attachment */
  filename: string;
  /** MIME type of the attachment */
  contentType?: string;
}

/**
 * Interface representing the result of sending an email
 */
export interface EmailSendResult {
  /** Whether the email was sent successfully */
  success: boolean;
  /** Message ID if successful, error message if failed */
  messageId?: string;
  /** Error details if sending failed */
  error?: string;
  /** Email address of the recipient */
  recipient: string;
  /** Subject of the email */
  subject: string;
  /** Additional notes about the email sending process */
  message?: string;
  /** Optional notes about the sending process */
  note?: string;
}
