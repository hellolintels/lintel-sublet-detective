
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Upload } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_FILE_TYPES = ["text/csv", "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"];

const contactFormSchema = z.object({
  fullName: z.string()
    .min(2, { message: "Full name must be at least 2 characters" })
    .regex(/^[a-zA-Z\s-']+$/, { message: "Name can only contain letters, spaces, hyphens and apostrophes" }),
  position: z.string()
    .min(2, { message: "Position must be at least 2 characters" })
    .regex(/^[a-zA-Z\s-']+$/, { message: "Position can only contain letters, spaces and hyphens" }),
  company: z.string()
    .min(2, { message: "Company name must be at least 2 characters" })
    .regex(/^[\w\s-'&.]+$/, { message: "Company name contains invalid characters" }),
  email: z.string()
    .min(1, { message: "Email is required" })
    .email({ message: "Please enter a valid email address" }),
  phone: z.string()
    .min(10, { message: "Phone number must be at least 10 digits" })
    .regex(/^[0-9+\s()-]+$/, { message: "Please enter a valid phone number" }),
  addressFile: z
    .instanceof(FileList)
    .refine((files) => files?.length === 1, "File is required")
    .refine(
      (files) => files?.[0]?.size <= MAX_FILE_SIZE,
      "Max file size is 5MB"
    )
    .refine(
      (files) => {
        // Check if the file type is accepted or if it ends with .csv/.xlsx (for browsers that don't properly set mime type)
        const file = files?.[0];
        if (!file) return false;
        
        const fileName = file.name.toLowerCase();
        if (fileName.endsWith('.csv') || fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
          return true;
        }
        
        return ACCEPTED_FILE_TYPES.includes(file.type);
      },
      "Only Excel and CSV files are accepted"
    ),
});

interface ContactFormProps {
  onOpenChange?: (open: boolean) => void;
  formType?: string;
}

export function ContactForm({ onOpenChange, formType = "sample" }: ContactFormProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const form = useForm<z.infer<typeof contactFormSchema>>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: {
      fullName: "",
      position: "",
      company: "",
      email: "",
      phone: "",
    },
  });

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      form.reset();
    }
  }, [open, form]);
  
  // Handle external open/close changes
  useEffect(() => {
    if (onOpenChange) {
      return () => {
        form.reset();
      };
    }
  }, [onOpenChange, form]);

  async function onSubmit(values: z.infer<typeof contactFormSchema>) {
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

      // Handle file data
      if (values.addressFile && values.addressFile[0]) {
        const file = values.addressFile[0];
        contactData.file_name = file.name;
        contactData.file_type = file.type || `application/${file.name.split('.').pop()}`;
        
        console.log("Processing file:", file.name, "size:", file.size, "type:", contactData.file_type);
        
        // Convert file to base64 for storage
        try {
          const fileBase64 = await readFileAsBase64(file);
          console.log("File converted to base64, length:", fileBase64.length);
          
          // Store the base64 data without the prefix
          const base64Data = fileBase64.split(',')[1];
          console.log("Base64 data extracted, length:", base64Data.length);
          
          contactData.file_data = base64Data;
        } catch (fileError) {
          console.error("Error converting file to base64:", fileError);
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
      
      // Close dialog and reset the form
      if (onOpenChange) {
        onOpenChange(false);
      }
      setOpen(false);
      form.reset();
      
      toast.success(
        "Thank you for your submission! We'll review your addresses and send you a sample report via email shortly.", 
        { duration: 6000 }
      );
    } catch (error) {
      console.error("Form submission error:", error);
      toast.error("Sorry, something went wrong. Please try again or contact support@lintels.in");
    } finally {
      setIsSubmitting(false);
    }
  }

  // Helper function to convert file to base64
  const readFileAsBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
        } else {
          reject(new Error("Failed to convert file to base64"));
        }
      };
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(file);
    });
  };

  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      setOpen(newOpen);
      if (!newOpen) {
        form.reset();
      }
    }}>
      <div id="contact-section" className="flex flex-col gap-4 w-full items-center py-8">
        <Button
          size="lg"
          className="bg-[hsl(24,97%,40%)] hover:bg-[hsl(24,97%,35%)] text-white px-8 py-4 text-lg rounded-full font-medium transition-colors duration-200"
          onClick={() => setOpen(true)}
        >
          Request a Sample Report
        </Button>
      </div>
      {open && (
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold mb-4">Request a Sample Report</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Upload your addresses to get a detailed report on potential AirBnb and other short-term lettings.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input placeholder="John Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="position"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Position</FormLabel>
                    <FormControl>
                      <Input placeholder="Property Manager" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="company"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company</FormLabel>
                    <FormControl>
                      <Input placeholder="Company Name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="john@company.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <Input type="tel" placeholder="07XXX XXXXXX" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="addressFile"
                render={({ field: { onChange, value, ...field } }) => (
                  <FormItem>
                    <FormLabel>Upload Addresses</FormLabel>
                    <FormControl>
                      <div className="relative w-full">
                        <Input
                          type="file"
                          accept=".csv,.xls,.xlsx"
                          onChange={(e) => {
                            console.log("File selected:", e.target.files);
                            onChange(e.target.files);
                          }}
                          {...field}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        />
                        <div className="flex items-center justify-center w-full border-2 border-dashed border-primary/50 rounded-lg p-4 hover:bg-primary/5 transition-colors">
                          <Upload className="mr-2 text-primary" />
                          <span className="text-sm text-muted-foreground">
                            {value && (value as FileList).length > 0 
                              ? `Selected: ${(value as FileList)[0].name}`
                              : "Upload addresses (CSV or Excel)"}
                          </span>
                        </div>
                      </div>
                    </FormControl>
                    <FormDescription className="text-center mt-1">
                      CSV or Excel file with street addresses and postcodes (max 20 rows)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? "Submitting..." : "Submit Request"}
              </Button>
            </form>
          </Form>
        </DialogContent>
      )}
    </Dialog>
  );
}
