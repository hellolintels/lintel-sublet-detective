
/**
 * Email-related type definitions for edge functions
 */

export interface EmailAttachment {
  filename: string;
  content: string | Uint8Array;
  contentType?: string;
  disposition?: string;
}

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  attachments?: EmailAttachment[];
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}
