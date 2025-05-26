import { corsHeaders } from './cors.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { ContactInfo, FileSubmission, ProcessingResult } from './types.ts';

/**
 * Initialize database client
 */
export function getSupabaseClient() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing database credentials");
  }
  
  return createClient(supabaseUrl, supabaseKey);
}

/**
 * Record a new submission in the database
 */
export async function recordSubmission(
  contactInfo: ContactInfo,
  fileInfo: FileSubmission
): Promise<string> {
  try {
    console.log("Recording submission for:", contactInfo.full_name);
    
    const supabase = getSupabaseClient();
    
    const submissionData = {
      full_name: contactInfo.full_name,
      email: contactInfo.email,
      company: contactInfo.company || '',
      position: contactInfo.position || '',
      phone: contactInfo.phone || '',
      storage_path: fileInfo.storagePath,
      status: 'pending',
      updated_at: new Date().toISOString(),
    };
    
    const { data, error } = await supabase
      .from('pending_submissions')
      .insert(submissionData)
      .select('id')
      .single();
      
    if (error) {
      console.error("Error recording submission:", error);
      throw new Error(`Database error: ${error.message}`);
    }
    
    if (!data || !data.id) {
      throw new Error("No submission ID returned");
    }
    
    console.log("Submission recorded successfully with ID:", data.id);
    return data.id;
  } catch (error) {
    console.error("Error in recordSubmission:", error);
    throw error;
  }
}

/**
 * Get submission details by ID
 */
export async function getSubmission(id: string) {
  try {
    console.log("Fetching submission:", id);
    
    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase
      .from('pending_submissions')
      .select('*')
      .eq('id', id)
      .single();
      
    if (error) {
      console.error("Error fetching submission:", error);
      throw new Error(`Database error: ${error.message}`);
    }
    
    if (!data) {
      throw new Error(`Submission not found: ${id}`);
    }
    
    console.log("Submission retrieved:", data.id);
    return data;
  } catch (error) {
    console.error("Error in getSubmission:", error);
    throw error;
  }
}

/**
 * Update submission status
 */
export async function updateSubmissionStatus(id: string, status: string, errorMessage?: string) {
  try {
    console.log(`Updating submission ${id} status to: ${status}`);
    
    const supabase = getSupabaseClient();
    
    const updateData: any = {
      status,
      updated_at: new Date().toISOString()
    };
    
    if (errorMessage) {
      updateData.error_message = errorMessage;
    }
    
    const { error } = await supabase
      .from('pending_submissions')
      .update(updateData)
      .eq('id', id);
      
    if (error) {
      console.error("Error updating submission status:", error);
      throw new Error(`Database error: ${error.message}`);
    }
    
    console.log("Submission status updated successfully");
  } catch (error) {
    console.error("Error in updateSubmissionStatus:", error);
    throw error;
  }
}

/**
 * Create a contact record from a submission
 */
export async function createContactFromSubmission(submissionId: string, approvedFilePath: string) {
  try {
    console.log(`Creating contact from submission: ${submissionId}`);
    
    const supabase = getSupabaseClient();
    
    // Get submission
    const submission = await getSubmission(submissionId);
    
    // Create contact
    const contactData = {
      full_name: submission.full_name,
      email: submission.email,
      company: submission.company,
      position: submission.position,
      phone: submission.phone,
      approved_file_path: approvedFilePath,
      status: "approved",
      form_type: "sample"
    };
    
    const { data, error } = await supabase
      .from('contacts')
      .insert(contactData)
      .select('id')
      .single();
      
    if (error) {
      console.error("Error creating contact:", error);
      throw new Error(`Database error: ${error.message}`);
    }
    
    if (!data || !data.id) {
      throw new Error("No contact ID returned");
    }
    
    console.log("Contact created successfully with ID:", data.id);
    return data.id;
  } catch (error) {
    console.error("Error in createContactFromSubmission:", error);
    throw error;
  }
}

/**
 * Create a new report for a contact
 */
export async function createReport(contactId: string, properties: number, matches: number, htmlContent: string) {
  try {
    console.log(`Creating report for contact: ${contactId}`);
    
    const supabase = getSupabaseClient();
    
    const reportData = {
      contact_id: contactId,
      properties_count: properties,
      matches_count: matches,
      html_content: htmlContent,
      status: "processed"
    };
    
    const { data, error } = await supabase
      .from('reports')
      .insert(reportData)
      .select('id')
      .single();
      
    if (error) {
      console.error("Error creating report:", error);
      throw new Error(`Database error: ${error.message}`);
    }
    
    if (!data || !data.id) {
      throw new Error("No report ID returned");
    }
    
    console.log("Report created successfully with ID:", data.id);
    return data.id;
  } catch (error) {
    console.error("Error in createReport:", error);
    throw error;
  }
}

/**
 * Update contact status with processing_status enum
 */
export async function updateContactStatus(id: string, status: string) {
  try {
    console.log(`Updating contact ${id} status to: ${status}`);
    
    const supabase = getSupabaseClient();
    
    const updateData: any = {
      status,
      processing_status: status, // Also update the new processing_status column
      updated_at: new Date().toISOString()
    };
    
    const { error } = await supabase
      .from('contacts')
      .update(updateData)
      .eq('id', id);
      
    if (error) {
      console.error("Error updating contact status:", error);
      throw new Error(`Database error: ${error.message}`);
    }
    
    console.log("Contact status updated successfully");
  } catch (error) {
    console.error("Error in updateContactStatus:", error);
    throw error;
  }
}
