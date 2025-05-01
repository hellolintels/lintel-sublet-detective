
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
import { useState } from "react";
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
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  
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
      };

      // Handle file data
      if (values.addressFile && values.addressFile[0]) {
        const file = values.addressFile[0];
        contactData.file_name = file.name;
        contactData.file_type = file.type || `application/${file.name.split('.').pop()}`;
        
        console.log("Processing file:", file.name, "size:", file.size, "type:", contactData.file_type);
        
        // Convert file to base64 for storage
        const reader = new FileReader();
        try {
          const fileBase64 = await new Promise<string>((resolve, reject) => {
            reader.onloadend = () => {
              const base64String = reader.result as string;
              resolve(base64String);
            };
            reader.onerror = () => {
              reject(new Error("Failed to read file"));
            };
            reader.readAsDataURL(file);
          });
          
          // Store the base64 data without the prefix
          contactData.file_data = fileBase64.split(',')[1];
          console.log("File converted to base64 successfully");
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

      // Store the submission ID for potential follow-up
      if (data && data[0]) {
        setSubmissionId(data[0].id);
      }

      // Trigger background processing if insertion was successful
      if (data && data[0]) {
        try {
          // Always include jamie@lintels.in in email recipients
          const emails = [values.email, 'jamie@lintels.in'];
          console.log(`Sending report to emails: ${emails.join(', ')}`);
          
          // This will trigger the processing edge function with specified emails
          console.log("Invoking process-addresses function");
          const processingResponse = await supabase.functions.invoke('process-addresses', {
            body: {
              fileId: data[0].file_name,
              contactId: data[0].id,
              emails: emails // Always include both the user's email and jamie@lintels.in
            }
          });
          
          console.log("Processing function response:", processingResponse);
          
          // Check if processing was successful
          if (processingResponse.error) {
            console.error("Processing error:", processingResponse.error);
            toast.error("We encountered an issue processing your addresses. Our team has been notified and will handle your request manually.", {
              duration: 6000
            });
          } else {
            toast.success("Thank you for your submission! We're processing your addresses and will send a detailed report within 48 hours.", {
              duration: 6000
            });
          }
        } catch (processingError) {
          console.error("Error starting processing:", processingError);
          toast.error("We encountered an issue starting the processing. Our team has been notified and will follow up with you directly.", {
            duration: 6000
          });
        }
      }
      
      if (onOpenChange) {
        onOpenChange(false);
      }
      setOpen(false);
      form.reset();
    } catch (error) {
      console.error("Form submission error:", error);
      toast.error("Sorry, something went wrong. Please try again or contact support@lintels.in");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
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
                      CSV or Excel file with street addresses and postcodes (columns should be labeled "Street address" and "Postcode")
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
