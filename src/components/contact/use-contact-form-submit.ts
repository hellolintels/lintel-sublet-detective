
// src/components/contact/use-contact-form-submit.ts
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ContactFormValues } from "./contact-form-schema";
import { countFileRows } from "./file-utils"; // Keep row counting
import { MAX_ROWS } from "./contact-form-schema";
import { v4 as uuidv4 } from "uuid"; // Need to install uuid

export function useContactFormSubmit(formType: string, onSuccess?: () => void) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

      // Verify row count (optional but good to keep)
      try {
        const rowCount = await countFileRows(file);
        console.log("File contains approximately", rowCount, "rows");

        if (rowCount > MAX_ROWS) {
          toast.error(`Sorry, only files with up to ${MAX_ROWS} addresses are allowed for the sample report.`);
          setIsSubmitting(false);
          return false;
        }
      } catch (countError) {
        console.error("Error counting rows:", countError);
        // Continue even if row counting fails
      }

      // First, check if we have the pending-uploads bucket available
      const { data: buckets, error: bucketsError } = await supabase
        .storage
        .listBuckets();
        
      if (bucketsError) {
        console.warn("Could not check storage buckets:", bucketsError.message);
        // Continue anyway, the function might still work
      } else {
        const pendingBucketExists = buckets?.some(b => b.name === 'pending-uploads');
        if (!pendingBucketExists) {
          // Create the bucket if it doesn't exist
          const { data: newBucket, error: createError } = await supabase
            .storage
            .createBucket('pending-uploads', { public: false });
            
          if (createError) {
            console.error("Failed to create pending-uploads bucket:", createError);
            setError("Storage setup failed. Please contact support.");
            setIsSubmitting(false);
            return false;
          } else {
            console.log("Created pending-uploads bucket:", newBucket);
          }
        }
      }

      // 1. Upload file to Supabase Storage
      const fileExt = file.name.split(".").pop();
      const uniqueFileName = `${uuidv4()}.${fileExt}`;
      const storagePath = `public/${uniqueFileName}`;

      console.log(`Uploading file to Supabase Storage at path: ${storagePath}`);
      const uploadPromise = supabase.storage
        .from("pending-uploads")
        .upload(storagePath, file);
        
      const { data: uploadData, error: uploadError } = await uploadPromise;

      if (uploadError) {
        console.error("Supabase Storage upload error:", uploadError);
        setError("Failed to upload file. Please try again or contact support.");
        throw new Error(`Failed to upload file: ${uploadError.message}`);
      }

      console.log("File uploaded successfully:", uploadData);

      // 2. Prepare data for the notify-admin function
      const notificationPayload = {
        full_name: values.fullName,
        email: values.email,
        company: values.company,
        position: values.position,
        phone: values.phone,
        storagePath: storagePath,
        form_type: formType
      };

      // 3. Call the notify-admin function
      console.log(`Calling notify-admin function with payload:`, notificationPayload);
      
      // Add a toast notification that we're processing
      toast.loading("Processing your submission...", {
        id: "processing-submission",
        duration: 10000
      });
      
      const { data: functionData, error: functionError } = await supabase.functions.invoke("notify-admin", {
        body: notificationPayload
      });

      if (functionError) {
        console.error("notify-admin function invocation error:", functionError);
        toast.dismiss("processing-submission");
        
        // Check if it's a connection error
        if (functionError.message?.includes("Failed to fetch") || 
            functionError.message?.includes("NetworkError") ||
            functionError.message?.includes("network")) {
          setError("Network error connecting to our servers. Please check your internet connection and try again.");
          toast.error("Network error connecting to our servers. Please check your internet connection and try again.");
          
          // Attempt to delete the uploaded file if function call fails
          try {
            await supabase.storage.from("pending-uploads").remove([storagePath]);
            console.log("Cleaned up uploaded file after function error.");
          } catch (cleanupError) {
            console.error("Failed to cleanup uploaded file after function error:", cleanupError);
          }
          
          setIsSubmitting(false);
          return false;
        }
        
        // Attempt to delete the uploaded file if function call fails
        try {
          await supabase.storage.from("pending-uploads").remove([storagePath]);
          console.log("Cleaned up uploaded file after function error.");
        } catch (cleanupError) {
          console.error("Failed to cleanup uploaded file after function error:", cleanupError);
        }
        
        setError(`Failed to process submission: ${functionError.message || "Unknown error"}`);
        throw new Error(`Failed to process submission: ${functionError.message || "Unknown error"}`);
      }

      console.log("notify-admin function success:", functionData);
      toast.dismiss("processing-submission");

      // Mark as success
      if (onSuccess) {
        onSuccess();
      }
      
      setError(null);

      // Check if email was sent successfully
      if (functionData?.emailSent === false) {
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

      return true;

    } catch (error: any) {
      console.error("Form submission error:", error);
      toast.dismiss("processing-submission");
      
      // Enhanced error message based on error type
      let errorMessage = "Sorry, something went wrong.";
      
      if (error instanceof Error) {
        if (error.message.includes("Failed to fetch") || error.message.includes("NetworkError")) {
          errorMessage = "Network error connecting to our servers. Please check your internet connection and try again.";
        } else if (error.message.includes("Edge Function")) {
          errorMessage = "Server processing error. Our team has been notified. Please try again later.";
        } else {
          errorMessage = `Error: ${error.message}`;
        }
      }
      
      setError(errorMessage);
      toast.error(`${errorMessage} Please contact support@lintels.in if the problem persists.`);
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
