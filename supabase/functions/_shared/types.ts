
/**
 * Common types used across edge functions
 */

// Basic contact information
export interface ContactInfo {
  id?: string;
  full_name: string;
  email: string;
  company: string;
  position?: string;
  phone?: string;
  form_type?: string;
}

// File submission details
export interface FileSubmission {
  storagePath: string;
  file_name?: string;
  file_type?: string;
}

// Combined submission data
export interface SubmissionPayload extends ContactInfo, FileSubmission {}

// Processing options
export interface ProcessingOptions {
  skipValidation?: boolean;
  maxAddressCount?: number;
  scraperType?: 'bright-data' | 'scrapingbee' | 'aws' | 'none';
}

// Result formats
export interface ProcessingResult {
  success: boolean;
  submissionId?: string;
  emailSent?: boolean;
  message?: string;
  error?: string;
  status?: string;
}

// Approval actions
export type ApprovalAction = 'approve' | 'reject';

// Scraped data types
export interface PostcodeResult {
  postcode: string;
  address?: string;
  matches?: MatchResult[];
  error?: string;
}

export interface MatchResult {
  platform: string;
  url: string;
  details?: any;
}

// Report formats
export interface ReportData {
  contact_id: string;
  report_id?: string;
  html_content?: string;
  matches_count?: number;
  properties_count?: number;
  status?: string;
}
