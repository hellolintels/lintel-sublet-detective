
import * as z from "zod";

// Constants
export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
export const ACCEPTED_FILE_TYPES = ["text/csv", "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"];
export const MAX_ROWS = 120; // Maximum number of rows allowed in the address file - increased from 20 to 120

// Organization type options
export const ORGANIZATION_TYPES = [
  "Letting Agency",
  "Housing Association", 
  "Landlord",
  "Other"
] as const;

export type OrganizationType = typeof ORGANIZATION_TYPES[number];

// Validation schema for the contact form
export const contactFormSchema = z.object({
  fullName: z.string()
    .min(2, { message: "Full name must be at least 2 characters" })
    .regex(/^[a-zA-Z\s-']+$/, { message: "Name can only contain letters, spaces, hyphens and apostrophes" }),
  position: z.string()
    .min(2, { message: "Position must be at least 2 characters" })
    .regex(/^[a-zA-Z\s-']+$/, { message: "Position can only contain letters, spaces and hyphens" }),
  company: z.string()
    .min(2, { message: "Company must be at least 2 characters" })
    .regex(/^[\w\s-'&.]+$/, { message: "Company name contains invalid characters" }),
  organizationType: z.enum(ORGANIZATION_TYPES, {
    required_error: "Please select an organization type"
  }),
  organizationOther: z.string()
    .max(18, { message: "Organization type cannot exceed 18 characters" })
    .optional(),
  email: z.string()
    .min(1, { message: "Email is required" })
    .email({ message: "Please enter a valid email address" }),
  phone: z.string()
    .min(10, { message: "Phone number must be at least 10 digits" })
    .regex(/^[0-9+\s()-]+$/, { message: "Please enter a valid phone number" }),
  addressFile: z
    .instanceof(FileList)
    .refine((files) => files?.length === 1, "File is required")
    .refine(
      (files) => files?.[0]?.size <= MAX_FILE_SIZE,
      "Max file size is 5MB"
    )
    .refine(
      (files) => {
        // Check if the file type is accepted or if it ends with .csv/.xlsx (for browsers that don't properly set mime type)
        const file = files?.[0];
        if (!file) return false;
        
        const fileName = file.name.toLowerCase();
        if (fileName.endsWith('.csv') || fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
          return true;
        }
        
        return ACCEPTED_FILE_TYPES.includes(file.type);
      },
      "Only Excel and CSV files are accepted"
    ),
}).refine((data) => {
  // If "Other" is selected, organizationOther must be provided
  if (data.organizationType === "Other" && !data.organizationOther?.trim()) {
    return false;
  }
  return true;
}, {
  message: "Please specify your organization type",
  path: ["organizationOther"]
});

// Type inference
export type ContactFormValues = z.infer<typeof contactFormSchema>;
