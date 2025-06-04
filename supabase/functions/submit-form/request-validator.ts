
export interface SubmissionRequest {
  full_name: string;
  email: string;
  company: string;
  position: string;
  phone: string;
  organization_type: string;
  organization_other?: string;
  storagePath: string;
  form_type: string;
  file_name?: string;
  file_type?: string;
}

export function validateSubmissionRequest(requestData: any): SubmissionRequest {
  const {
    full_name,
    email,
    company,
    position,
    phone,
    organization_type,
    organization_other,
    storagePath,
    form_type,
    file_name,
    file_type
  } = requestData;

  // Basic validation
  if (!full_name || !email || !company || !storagePath || !form_type) {
    throw new Error('Missing required fields');
  }

  if (!organization_type) {
    throw new Error('Organization type is required');
  }

  // Validate organization_other when organization_type is "Other"
  if (organization_type === "Other" && (!organization_other || !organization_other.trim())) {
    throw new Error('Please specify your organization type');
  }

  return {
    full_name,
    email,
    company,
    position: position || '',
    phone: phone || '',
    organization_type,
    organization_other: organization_type === "Other" ? organization_other : undefined,
    storagePath,
    form_type,
    file_name,
    file_type
  };
}
