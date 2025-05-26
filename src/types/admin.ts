
// Define the contact request type
export interface ContactRequest {
  id: string;
  full_name: string;
  company: string;
  email: string;
  created_at: string;
  status: string;
  processing_status?: string;
  file_name: string;
}

// Define the report type
export interface Report {
  id: string;
  contact_id: string;
  properties_count: number;
  matches_count: number;
  created_at: string;
  status: string;
  report_type?: string;
  included_matches?: string[];
}

// Define the match result type
export interface MatchResult {
  id: string;
  contact_id: string;
  postcode: string;
  address?: string;
  platform: string;
  matched_listing_url: string;
  confidence_score?: number;
  listing_title?: string;
  listing_details?: any;
  outcome: 'pending' | 'approved' | 'rejected' | 'no_match';
  created_at: string;
  reviewed_at?: string;
  reviewed_by?: string;
}
