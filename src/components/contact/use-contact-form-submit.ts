
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
      }
      
      // Convert file to base64
      const fileBase64 = await readFileAsBase64(file);
      console.log(`File converted to base64, length: ${fileBase64.length}`);
      
      // Prepare data for Supabase
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

      // Save to Supabase
      console.log("Saving contact data to Supabase");
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
        
        // Send notification email with the file attachment
        try {
          console.log(`Sending email notification for contact ID ${contactId} with file: ${file.name}`);
          
          const notifyResponse = await supabase.functions.invoke("notify-admin", {
            body: { 
              contactId: contactId,
              directFileData: {
                fileName: file.name,
                fileType: file.type,
                fileContent: fileBase64
              }
            }
          });
          
          if (notifyResponse.error) {
            console.error("Email notification error:", notifyResponse.error);
            console.error("Error details:", JSON.stringify(notifyResponse.error));
          } else {
            console.log("Email notification success:", notifyResponse.data);
            console.log(`Email sent successfully with file: ${file.name}`);
          }
        } catch (functionCallError) {
          console.error("Failed to call notify-admin function:", functionCallError);
          console.error("Error details:", JSON.stringify(functionCallError));
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
