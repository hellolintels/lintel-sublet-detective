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
import { Upload, Download } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useState } from "react";
import { toast } from "sonner";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_FILE_TYPES = ["text/csv", "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"];

const formSchema = z.object({
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
});

export function ContactForm() {
  const [open, setOpen] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: "",
      position: "",
      company: "",
      email: "",
      phone: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      const files = values.addressFile as FileList;
      if (files && files[0]) {
        const subject = encodeURIComponent(`Sample request from ${values.company}`);
        const body = encodeURIComponent(`
Name: ${values.fullName}
Position: ${values.position}
Company: ${values.company}
Email: ${values.email}
Phone: ${values.phone}

A CSV file with addresses has been attached to this email.
        `);
        
        const fileURL = URL.createObjectURL(files[0]);
        const tempLink = document.createElement('a');
        tempLink.href = fileURL;
        tempLink.download = 'addresses.csv';
        
        tempLink.click();
        URL.revokeObjectURL(fileURL);

        window.location.href = `mailto:jamie@lintels.in?subject=${subject}&body=${body}`;
        
        toast.success("Thank you! We've received your submission and will send your sample report within 48 hours. Please check your email for confirmation.", {
          duration: 6000
        });
        setOpen(false);
        form.reset();
      } else {
        throw new Error("No file selected");
      }
    } catch (error) {
      toast.error("Sorry that didn't work. Please try again or email support@lintels.in attaching the sample CSV");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <div className="flex flex-col gap-4 w-full items-center">
        <Button
          size="lg"
          className="bg-[hsl(24,97%,40%)] hover:bg-[hsl(24,97%,35%)] text-white px-8 py-4 text-lg rounded-full font-medium transition-colors duration-200"
          onClick={() => setOpen(true)}
        >
          Request a Sample Report
        </Button>
        <Button 
          variant="outline"
          size="lg"
          className="bg-white hover:bg-gray-100 text-black border-gray-300 w-full sm:w-auto"
          onClick={() => window.open("https://workspace.google.com/marketplace/app/lintelsin/123456789", "_blank")}
        >
          <Download className="mr-2" />
          Install Google Workspace Add-on
        </Button>
      </div>
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
            
            <Button type="submit" className="w-full">Submit Request</Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
