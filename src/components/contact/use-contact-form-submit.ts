
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
        console.log("File last modified:", new Date(file.lastModified).toISOString());
        
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
        
        // Convert file to base64 with improved validation and error handling
        try {
          // Read file as base64
          const fileBase64 = await readFileAsBase64(file);
          console.log("File successfully converted to base64");
          console.log(`Base64 data length: ${fileBase64.length}`);
          
          // Extract the base64 data without the prefix
          let base64Data = "";
          if (fileBase64.includes(',')) {
            base64Data = fileBase64.split(',')[1];
            console.log("Base64 data extracted from data URI, length:", base64Data.length);
          } else {
            base64Data = fileBase64;
            console.log("Base64 data used as is, length:", base64Data.length);
          }
          
          if (!base64Data) {
            throw new Error("Failed to extract base64 data from file");
          }
          
          // Verify the base64 data is valid
          try {
            const sampleData = base64Data.substring(0, Math.min(10, base64Data.length));
            atob(sampleData); // Will throw if invalid base64
            console.log("Base64 validation check passed");
          } catch (e) {
            console.error("Invalid base64 data:", e);
            throw new Error("File produced invalid base64 data");
          }
          
          // Store the base64 data in the contact record
          contactData.file_data = base64Data;
          console.log(`File data ready for submission, length: ${contactData.file_data.length}`);
          console.log(`File data first 50 chars: ${contactData.file_data.substring(0, 50)}`);
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
        // Trigger the edge function to process the addresses
        try {
          console.log("Calling process-addresses edge function");
          const functionResponse = await supabase.functions.invoke("process-addresses", {
            body: { 
              contactId: data[0].id,
              action: "initial_process"
            }
          });
          
          if (functionResponse.error) {
            console.error("Edge function error:", functionResponse.error);
            toast.error("There was an issue processing your request. Our team has been notified.");
            // Continue without failing - the report can be processed manually
          } else {
            console.log("Address processing initiated successfully", functionResponse.data);
            
            // Check if the email was sent
            if (functionResponse.data && functionResponse.data.email_sent) {
              console.log("Confirmation email was sent successfully");
            } else {
              console.warn("Email sending might have failed:", functionResponse.data);
              // Still continue as this is just a warning
            }
          }
        } catch (functionCallError) {
          console.error("Failed to call edge function:", functionCallError);
          toast.error("There was an issue processing your request. Our team has been notified.");
          // Continue without failing
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
