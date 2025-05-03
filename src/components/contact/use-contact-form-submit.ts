
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ContactFormValues } from "./contact-form-schema";
import { countFileRows, readFileAsBase64 } from "./file-utils";
import { MAX_ROWS } from "./contact-form-schema";

export function useContactFormSubmit(formType: string, onSuccess?: () => void) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submitContactForm(values: ContactFormValues) {
    try {
      setIsSubmitting(true);
      console.log("Form submission started with values:", values);

      // Handle file data
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
        // Continue anyway
      }
      
      // Convert file to base64 - this will be used both for storage and email
      const fileBase64 = await readFileAsBase64(file);
      console.log(`File converted to base64, length: ${fileBase64.length}`);
      
      // Prepare contact data for Supabase
      const contactData = {
        full_name: values.fullName,
        position: values.position,
        company: values.company,
        email: values.email,
        phone: values.phone,
        form_type: formType,
        status: "new",
        file_name: file.name,
        file_type: file.type,
        file_data: fileBase64
      };

      // Insert into Supabase
      console.log("Submitting contact data to Supabase");
      const { data, error } = await supabase
        .from('contacts')
        .insert([contactData])
        .select();

      if (error) {
        console.error("Supabase error:", error);
        throw new Error(error.message);
      }

      console.log("Contact successfully created:", data);
      
      if (data && data.length > 0) {
        const contactId = data[0].id;
        
        // Send the email immediately with the already-processed base64 file
        try {
          console.log("Sending email with direct file attachment");
          
          // Extract the clean base64 content without the data URI prefix
          let cleanFileContent = fileBase64;
          if (fileBase64.includes('base64,')) {
            cleanFileContent = fileBase64.split('base64,')[1];
            console.log(`Extracted clean base64 content (length: ${cleanFileContent.length})`);
          }
          
          const notifyResponse = await supabase.functions.invoke("notify-admin", {
            body: { 
              contactId: contactId,
              directFileData: {
                fileName: file.name,
                fileType: file.type,
                fileContent: cleanFileContent
              }
            }
          });
          
          console.log("Notify admin response:", notifyResponse);
          
          if (notifyResponse.error) {
            console.error("Notification error:", notifyResponse.error);
            // Don't block the form submission on email error
            console.log("Proceeding despite email sending error");
          } else {
            console.log("Admin notification sent successfully");
          }
        } catch (functionCallError) {
          console.error("Failed to call notify-admin function:", functionCallError);
          // Don't block the form submission on email error
          console.log("Proceeding despite email sending error");
        }
      }
      
      if (onSuccess) {
        onSuccess();
      }
      
      toast.success(
        "Thank you for your submission! We'll review your addresses and send you a sample report via email shortly.", 
        { duration: 6000 }
      );
      
      return true;
    } catch (error) {
      console.error("Form submission error:", error);
      toast.error("Sorry, something went wrong. Please try again or contact support@lintels.in");
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
