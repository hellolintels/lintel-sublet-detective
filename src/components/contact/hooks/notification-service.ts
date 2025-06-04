
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface AdminNotificationPayload {
  full_name: string;
  email: string;
  company: string;
  position: string;
  phone: string;
  organization_type?: string;
  organization_other?: string;
  storagePath: string;
  form_type: string;
  file_name?: string;
  file_type?: string;
}

export async function notifyAdmin(payload: AdminNotificationPayload) {
  console.log("Calling submit-form function with payload:", payload);
  
  const { data, error } = await supabase.functions.invoke("submit-form", {
    body: payload
  });

  if (error) {
    console.error("submit-form function error:", error);
    throw new Error(error.message || "Failed to submit form");
  }

  console.log("submit-form function response:", data);
  return data;
}

export function showResultNotifications(functionData: any) {
  toast.dismiss("processing-submission");
  
  if (functionData?.autoProcessed) {
    toast.success("Your file has been automatically approved and processing has started!", {
      description: "You will receive your report within 24 hours.",
      duration: 8000
    });
  } else if (functionData?.emailSent) {
    toast.success("Request submitted successfully!", {
      description: "We'll review your submission and get back to you soon.",
      duration: 5000
    });
  } else {
    toast.success("Request received!", {
      description: "Your submission is being processed. We'll contact you soon.",
      duration: 5000
    });
  }
}

export function showErrorNotification(error: any): string {
  let errorMessage = "There was an error submitting your request. Please try again.";
  
  if (error.message?.includes("network") || error.message?.includes("connect")) {
    errorMessage = "Network error. Please check your internet connection and try again.";
  } else if (error.message?.includes("storage")) {
    errorMessage = "File upload failed. Please try again or contact support.";
  } else if (error.message) {
    errorMessage = error.message;
  }
  
  toast.error(errorMessage, {
    duration: 7000
  });
  
  return errorMessage;
}
