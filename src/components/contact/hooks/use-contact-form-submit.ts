
import { useState } from "react";
import { toast } from "sonner";
import { ContactFormValues } from "../contact-form-schema";
import { countFileRows } from "../file-utils";
import { MAX_ROWS } from "../contact-form-schema";
import { ensureStorageSetup, uploadFileToPendingBucket, deleteFileFromPendingBucket } from "./storage-utils";
import { notifyAdmin, showResultNotifications, showErrorNotification, AdminNotificationPayload } from "./notification-service";

export function useContactFormSubmit(formType: string, onSuccess?: () => void) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [setupAttempted, setSetupAttempted] = useState(false);

  async function submitContactForm(values: ContactFormValues) {
    try {
      setIsSubmitting(true);
      setError(null);
      console.log("Form submission started with values:", {
        ...values,
        addressFile: values.addressFile ? `${values.addressFile[0].name} (${values.addressFile[0].size} bytes)` : null
      });

      // Validate file
      if (!values.addressFile || !values.addressFile[0]) {
        toast.error("Please select a valid file");
        setIsSubmitting(false);
        return false;
      }

      const file = values.addressFile[0];
      console.log(`Processing file: ${file.name}, size: ${file.size}, type: ${file.type}`);

      // Verify row count with enhanced debugging
      try {
        const rowCount = await countFileRows(file);
        console.log("File contains approximately", rowCount, "rows");
        console.log(`MAX_ROWS from schema: ${MAX_ROWS}`);
        console.log(`Comparison (${rowCount} > ${MAX_ROWS}): ${rowCount > MAX_ROWS}`);

        // Fix: Ensure strict number comparison
        const numericRowCount = Number(rowCount);
        console.log(`Numeric row count: ${numericRowCount}, type: ${typeof numericRowCount}`);
        
        // Explicitly check if the row count exceeds the maximum allowed
        if (numericRowCount > MAX_ROWS) {
          console.log(`Row count check FAILED: ${numericRowCount} > ${MAX_ROWS}`);
          toast.error(`Sorry, only files with up to ${MAX_ROWS} addresses are allowed for the sample report.`);
          setIsSubmitting(false);
          return false;
        } else {
          console.log(`Row count check PASSED: ${numericRowCount} ≤ ${MAX_ROWS}`);
        }
      } catch (countError) {
        console.error("Error counting rows:", countError);
        // Continue even if row counting fails, but log it for debugging
        console.log("Continuing despite row count error");
      }

      // Ensure storage buckets exist
      try {
        const storageReady = await ensureStorageSetup();
        if (!storageReady) {
          throw new Error("Storage system is not available");
        }
        setSetupAttempted(true);
      } catch (storageError) {
        console.error("Storage setup error:", storageError);
        toast.error("Could not access storage system. Please try again later.");
        setIsSubmitting(false);
        return false;
      }

      // Upload file to Supabase Storage
      let storagePath: string;
      try {
        storagePath = await uploadFileToPendingBucket(file, values.email.split('@')[0]);
      } catch (uploadError: any) {
        console.error("File upload error:", uploadError);
        toast.error(`Failed to upload file: ${uploadError.message}`);
        setIsSubmitting(false);
        return false;
      }

      // Prepare data for the notify-admin function
      const notificationPayload: AdminNotificationPayload = {
        full_name: values.fullName,
        email: values.email,
        company: values.company || '',
        position: values.position || '',
        phone: values.phone || '',
        storagePath: storagePath,
        form_type: formType
      };

      console.log(`Calling notify-admin function with payload:`, notificationPayload);
      
      // Show loading toast
      toast.loading("Submitting your request...", {
        id: "processing-submission",
        duration: 10000
      });
      
      // Call the notify-admin function
      try {
        const functionData = await notifyAdmin(notificationPayload);
        
        // Success handling
        if (onSuccess) {
          onSuccess();
        }
        
        setError(null);
        showResultNotifications(functionData);
        return true;
      } catch (functionError: any) {
        console.error("notify-admin function error:", functionError);
        toast.dismiss("processing-submission");
        
        // Attempt to delete the uploaded file if function call fails
        await deleteFileFromPendingBucket(storagePath);
        
        throw new Error(`Failed to process submission: ${functionError.message || "Unknown error"}`);
      }
    } catch (error: any) {
      console.error("Form submission error:", error);
      toast.dismiss("processing-submission");
      
      const errorMessage = showErrorNotification(error);
      setError(errorMessage);
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }

  return {
    isSubmitting,
    error,
    submitContactForm
  };
}
