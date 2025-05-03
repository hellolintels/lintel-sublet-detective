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

  async function submitContactForm(values: ContactFormValues) {
    try {
      setIsSubmitting(true);
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

      // 1. Upload file to Supabase Storage
      const fileExt = file.name.split(".").pop();
      const uniqueFileName = `${uuidv4()}.${fileExt}`;
      const storagePath = `public/${uniqueFileName}`; // Store in a 'public' folder within the bucket for simplicity, adjust if needed

      console.log(`Uploading file to Supabase Storage at path: ${storagePath}`);
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("pending-uploads") // Ensure this bucket exists and has policies set
        .upload(storagePath, file);

      if (uploadError) {
        console.error("Supabase Storage upload error:", uploadError);
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
        storagePath: storagePath, // Pass the storage path
      };

      // 3. Call the notify-admin function
      console.log(`Calling notify-admin function with payload:`, notificationPayload);
      const { data: functionData, error: functionError } = await supabase.functions.invoke("notify-admin", {
        body: notificationPayload
      });

      if (functionError) {
        console.error("notify-admin function invocation error:", functionError);
        // Attempt to delete the uploaded file if function call fails
        try {
          await supabase.storage.from("pending-uploads").remove([storagePath]);
          console.log("Cleaned up uploaded file after function error.");
        } catch (cleanupError) {
          console.error("Failed to cleanup uploaded file after function error:", cleanupError);
        }
        throw new Error(`Failed to process submission: ${functionError.message || "Unknown error"}`);
      }

      console.log("notify-admin function success:", functionData);

      // Mark as success
      if (onSuccess) {
        onSuccess();
      }

      toast.success(
        "Thank you for your submission! Your address list has been sent for review and we'll be in touch soon.",
        { duration: 6000 }
      );

      return true;

    } catch (error) {
      console.error("Form submission error:", error);
      toast.error(`Sorry, something went wrong. Please try again or contact support@lintels.in. Error: ${error.message}`);
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }

  return {
    isSubmitting,
    submitContactForm
  };
}

