
// Define the contact request type
export interface ContactRequest {
  id: string;
  full_name: string;
  company: string;
  email: string;
  created_at: string;
  status: string;
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
}
