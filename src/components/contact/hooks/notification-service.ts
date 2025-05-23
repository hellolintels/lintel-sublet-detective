
import { toast } from "sonner";

/**
 * Sends a notification to the admin about a new submission
 * @param payload The data to send to the admin
 * @returns A promise that resolves to the function response
 */
export async function notifyAdmin(payload: AdminNotificationPayload): Promise<any> {
  try {
    // Use direct function call with the project reference
    const projectRef = "uejymkggevuvuerldzhv";
    const functionUrl = `https://${projectRef}.functions.supabase.co/notify-admin`;
    
    console.log(`Sending direct request to notify-admin at: ${functionUrl}`);
    
    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      const statusCode = response.status;
      const errorText = await response.text();
      console.error(`Error from notify-admin function: Status ${statusCode}`, errorText);
      throw new Error(`Server processing error (${statusCode}): ${errorText || response.statusText}`);
    }
    
    const functionData = await response.json();
    console.log("notify-admin response:", functionData);
    
    return functionData;
  } catch (error: any) {
    console.error("notify-admin function error:", error);
    throw error;
  }
}

/**
 * Shows appropriate success or error notifications to the user
 * @param result The result from the notification function
 * @param isApiBypass Whether this submission is bypassing API processing
 */
export function showResultNotifications(result: { emailSent: boolean } | null, isApiBypass: boolean = false): void {
  toast.dismiss("processing-submission");
  
  if (isApiBypass) {
    // Special message for API bypass mode
    toast.success(
      "Your submission has been received and sent for manual review. Due to system maintenance, processing will be handled manually. We'll be in touch soon!",
      { duration: 8000 }
    );
  } else {
    // Check if email was sent successfully
    if (result?.emailSent === false) {
      // The submission was received but email sending failed
      toast.success(
        "Your submission was received! However, there may be a delay in processing. We'll review it as soon as possible.",
        { duration: 6000 }
      );
    } else {
      // Normal success case
      toast.success(
        "Thank you for your submission! Your address list has been sent for review and we'll be in touch soon.",
        { duration: 6000 }
      );
    }
  }
}

/**
 * Shows an error notification with appropriate message based on error type
 * @param error The error to show a notification for
 * @returns A formatted error message
 */
export function showErrorNotification(error: any): string {
  // Enhanced error message based on error type
  let errorMessage = "Sorry, something went wrong.";
  
  if (error instanceof Error) {
    if (error.message.includes("Failed to fetch") || error.message.includes("NetworkError")) {
      errorMessage = "Network error connecting to our servers. Please check your internet connection and try again.";
    } else if (error.message.includes("Edge Function")) {
      errorMessage = "Server processing error. Our team has been notified. Please try again later.";
    } else if (error.message.includes("Storage system")) {
      errorMessage = "Storage system error. Please contact support@lintels.in for assistance.";
    } else if (error.message.includes("Bucket not found")) {
      errorMessage = "Storage configuration error. Please contact support@lintels.in for assistance.";
    } else if (error.message.includes("405")) {
      errorMessage = "Server rejected the request method. Please contact support@lintels.in for assistance.";
    } else {
      errorMessage = `Error: ${error.message}`;
    }
  }
  
  toast.error(`${errorMessage} Please contact support@lintels.in if the problem persists.`);
  return errorMessage;
}

/**
 * Type definition for admin notification payload
 */
export interface AdminNotificationPayload {
  full_name: string;
  email: string;
  company: string;
  position: string;
  phone: string;
  storagePath: string;
  form_type: string;
  bypass_api_processing?: boolean; // New optional flag
}
