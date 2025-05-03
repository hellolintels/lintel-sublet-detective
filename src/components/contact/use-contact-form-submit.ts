
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

      // Prepare data for Supabase
      const contactData: any = {
        full_name: values.fullName,
        position: values.position,
        company: values.company,
        email: values.email,
        phone: values.phone,
        form_type: formType,
        status: "new", // New status for pending approval
      };

      // Handle file data with improved error handling
      if (values.addressFile && values.addressFile[0]) {
        const file = values.addressFile[0];
        contactData.file_name = file.name;
        contactData.file_type = file.type || `application/${file.name.split('.').pop()}`;
        
        console.log("Processing file:", file.name, "size:", file.size, "type:", contactData.file_type);
        
        // Verify row count before processing
        try {
          const rowCount = await countFileRows(file);
          console.log("File contains approximately", rowCount, "rows");
          
          if (rowCount > MAX_ROWS) {
            toast.error(`Sorry, only files with up to ${MAX_ROWS} addresses are allowed for the sample report.`);
            setIsSubmitting(false);
            return;
          }
        } catch (countError) {
          console.error("Error counting rows:", countError);
          // Continue with submission but log the error
        }
        
        // Convert file to base64
        try {
          const fileBase64 = await readFileAsBase64(file);
          console.log("File successfully converted to base64");
          console.log(`Base64 data length: ${fileBase64.length}`);
          
          // Generate and log a content sample for verification
          const sampleBytes = fileBase64.substring(0, Math.min(100, fileBase64.length));
          console.log(`Base64 sample (first 20 chars): ${sampleBytes.substring(0, 20)}...`);
          
          // Store the base64 data in the contact record
          contactData.file_data = fileBase64;
        } catch (fileError) {
          console.error("Error processing file:", fileError);
          toast.error("Unable to process your file. Please try a different file format.");
          setIsSubmitting(false);
          return;
        }
      } else {
        console.error("No file selected or file is invalid");
        toast.error("Please select a valid CSV or Excel file");
        setIsSubmitting(false);
        return;
      }

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
        // Call the notify-admin edge function directly to send the email
        try {
          console.log("Calling notify-admin edge function");
          const notifyResponse = await supabase.functions.invoke("notify-admin", {
            body: { contactId: data[0].id }
          });
          
          console.log("Notify admin response:", notifyResponse);
          
          if (notifyResponse.error) {
            console.error("Notification error:", notifyResponse.error);
            toast.error("There was an error sending the notification. Our team has been notified.");
          } else {
            console.log("Admin notification sent successfully");
          }
        } catch (functionCallError) {
          console.error("Failed to call notify-admin function:", functionCallError);
          // Don't fail the form submission if notification fails
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
