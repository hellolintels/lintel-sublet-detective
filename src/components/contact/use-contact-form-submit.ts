
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ContactFormValues } from "./contact-form-schema";
import { countFileRows } from "./file-utils";
import { MAX_ROWS } from "./contact-form-schema";
import { v4 as uuidv4 } from "uuid";

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

      // Verify row count
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

      // Check if pending-uploads bucket exists before uploading
      try {
        console.log("Checking if pending-uploads bucket exists");
        const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
        
        if (bucketsError) {
          console.error("Could not check storage buckets:", bucketsError);
          throw new Error("Unable to access storage system");
        }
        
        const pendingBucketExists = buckets?.some(b => b.name === 'pending-uploads') || false;
        console.log("pending-uploads bucket exists:", pendingBucketExists);
        
        if (!pendingBucketExists) {
          console.log("pending-uploads bucket doesn't exist, calling setup function");
          
          // Call the setup function to create the buckets
          const { data: setupData, error: setupError } = await supabase.functions.invoke("setup");
          
          if (setupError) {
            console.error("Setup function error:", setupError);
            throw new Error("Storage system setup failed");
          }
          
          console.log("Setup function response:", setupData);
        }
      } catch (setupError) {
        console.error("Error setting up storage:", setupError);
        throw new Error("Storage system setup failed");
      }

      // Generate a unique file path
      const fileExt = file.name.split(".").pop() || "";
      const uniqueFileName = `${uuidv4()}.${fileExt}`;
      const storagePath = `${values.email.split('@')[0]}-${uniqueFileName}`;

      // Upload file to Supabase Storage
      console.log(`Uploading file to Supabase Storage at path: ${storagePath}`);
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("pending-uploads")
        .upload(storagePath, file);

      if (uploadError) {
        console.error("Supabase Storage upload error:", uploadError);
        
        // Handle specific error cases
        if (uploadError.message.includes("Bucket not found")) {
          throw new Error("Storage system not configured properly");
        }
        
        throw new Error(`Failed to upload file: ${uploadError.message}`);
      }

      console.log("File uploaded successfully:", uploadData);

      // Prepare data for the notify-admin function
      const notificationPayload = {
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
      toast.loading("Processing your submission...", {
        id: "processing-submission",
        duration: 10000
      });
      
      // Call the notify-admin function through our API endpoint
      try {
        const response = await fetch('/approve-processing/notify-admin', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(notificationPayload)
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error("Error from notify-admin function:", errorText);
          throw new Error(`Server processing error: ${response.status}`);
        }
        
        const functionData = await response.json();
        console.log("notify-admin response:", functionData);
        toast.dismiss("processing-submission");
        
        // Success handling
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
      } catch (functionError: any) {
        console.error("notify-admin function error:", functionError);
        toast.dismiss("processing-submission");
        
        // Attempt to delete the uploaded file if function call fails
        try {
          await supabase.storage.from("pending-uploads").remove([storagePath]);
          console.log("Cleaned up uploaded file after function error.");
        } catch (cleanupError) {
          console.error("Failed to cleanup uploaded file after function error:", cleanupError);
        }
        
        throw new Error(`Failed to process submission: ${functionError.message || "Unknown error"}`);
      }
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
        } else if (error.message.includes("Storage system")) {
          errorMessage = "Storage system error. Please contact support@lintels.in for assistance.";
        } else if (error.message.includes("Bucket not found")) {
          errorMessage = "Storage configuration error. Please contact support@lintels.in for assistance.";
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
