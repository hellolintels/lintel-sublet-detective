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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Checkbox } from "./ui/checkbox";

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
      (files) => ACCEPTED_FILE_TYPES.includes(files?.[0]?.type),
      "Only Excel and CSV files are accepted"
    ),
  applyForBeta: z.boolean().default(false).optional(),
});

interface ContactFormProps {
  onOpenChange?: (open: boolean) => void;
}

export function ContactForm({ onOpenChange }: ContactFormProps) {
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
      applyForBeta: false,
    },
  });

  async function onSubmit(values: z.infer<typeof contactFormSchema>) {
    try {
      setIsSubmitting(true);

      // Prepare data for Supabase
      const contactData: any = {
        full_name: values.fullName,
        position: values.position,
        company: values.company,
        email: values.email,
        phone: values.phone,
        form_type: values.applyForBeta ? "sample_and_beta" : "sample",
      };

      // Handle file data for sample form type
      if (values.addressFile && values.addressFile[0]) {
        const file = values.addressFile[0];
        contactData.file_name = file.name;
        contactData.file_type = file.type;
        
        // Convert file to base64 for storage
        const reader = new FileReader();
        const fileBase64 = await new Promise<string>((resolve) => {
          reader.onloadend = () => {
            const base64String = reader.result as string;
            resolve(base64String);
          };
          reader.readAsDataURL(file);
        });
        
        // Store the base64 data without the prefix
        contactData.file_data = fileBase64.split(',')[1];
      }

      // Insert into Supabase
      const { error } = await supabase
        .from('contacts')
        .insert([contactData]);

      if (error) {
        console.error("Supabase error:", error);
        throw new Error(error.message);
      }

      // Also send an email notification
      let subject, body;

      const files = values.addressFile as FileList;
      if (files && files[0]) {
        const fileURL = URL.createObjectURL(files[0]);
        const tempLink = document.createElement('a');
        tempLink.href = fileURL;
        tempLink.download = 'addresses.csv';
        tempLink.click();
        URL.revokeObjectURL(fileURL);
      }

      subject = encodeURIComponent(`${values.applyForBeta ? "Sample request and Beta access" : "Sample request"} from ${values.company}`);
      body = encodeURIComponent(`
Name: ${values.fullName}
Position: ${values.position}
Company: ${values.company}
Email: ${values.email}
Phone: ${values.phone}
${values.applyForBeta ? "Also requesting beta access: Yes" : ""}

A CSV file with addresses has been attached to this email.
      `);
      
      window.location.href = `mailto:jamie@lintels.in?subject=${subject}&body=${body}`;
      
      let successMessage = values.applyForBeta 
        ? "Thank you! We've received your sample report request and beta access application. We'll review it and get back to you shortly."
        : "Thank you! We've received your submission and will send your sample report within 48 hours. Please check your email for confirmation.";
      
      toast.success(successMessage, {
        duration: 6000
      });
      
      setOpen(false);
      form.reset();
    } catch (error) {
      console.error("Form submission error:", error);
      toast.error("Sorry that didn't work. Please try again or email support@lintels.in");
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
                          onChange={(e) => onChange(e.target.files)}
                          {...field}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        />
                        <div className="flex items-center justify-center w-full border-2 border-dashed border-primary/50 rounded-lg p-4 hover:bg-primary/5 transition-colors">
                          <Upload className="mr-2 text-primary" />
                          <span className="text-sm text-muted-foreground">
                            Upload addresses (CSV or Excel)
                          </span>
                        </div>
                      </div>
                    </FormControl>
                    <FormDescription className="text-center mt-1">
                      CSV or Excel file with street addresses and postcodes
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="applyForBeta"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>
                        Apply for Beta Access
                      </FormLabel>
                      <FormDescription>
                        I would also like to apply for beta access to the platform
                      </FormDescription>
                    </div>
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
