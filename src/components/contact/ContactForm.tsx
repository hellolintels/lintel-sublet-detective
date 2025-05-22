import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useState, useEffect } from "react";
import { contactFormSchema, ContactFormValues, MAX_ROWS } from "./contact-form-schema";
import { useContactFormSubmit } from "./hooks/use-contact-form-submit";
import { FileUploadField } from "./FileUploadField";
import { AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { countFileRows } from "./file-utils";

interface ContactFormProps {
  onOpenChange?: (open: boolean) => void;
  formType?: string;
  defaultOpen?: boolean;
  setupComplete?: boolean;
  isSettingUp?: boolean;
}

export function ContactForm({ 
  onOpenChange, 
  formType = "sample", 
  defaultOpen = false,
  setupComplete = false,
  isSettingUp = false
}: ContactFormProps) {
  const [open, setOpen] = useState(defaultOpen);
  
  const form = useForm<ContactFormValues>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: {
      fullName: "",
      position: "",
      company: "",
      email: "",
      phone: "",
    },
  });

  // Update the loading and error states to be more descriptive
  const [fileProcessingState, setFileProcessingState] = useState<
    "idle" | "counting" | "uploading" | "processing" | "completed" | "error"
  >("idle");
  
  const { isSubmitting, error, submitContactForm } = useContactFormSubmit(formType, () => {
    if (onOpenChange) {
      onOpenChange(false);
    }
    setOpen(false);
    form.reset();
    setFileProcessingState("idle");
  });

  useEffect(() => {
    // Initialize with defaultOpen value
    if (defaultOpen) {
      setOpen(true);
    }
  }, [defaultOpen]);

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

  async function onSubmit(values: ContactFormValues) {
    if (!setupComplete && !isSettingUp) {
      // Don't submit if setup isn't complete
      return;
    }

    try {
      setFileProcessingState("counting");
      
      // Verify file is valid
      if (!values.addressFile || !values.addressFile[0]) {
        toast.error("Please select a valid file");
        setFileProcessingState("error");
        return;
      }
      
      const file = values.addressFile[0];
      console.log("Processing file for submission:", file.name);
      
      // Verify row count before submitting
      try {
        const rowCount = await countFileRows(file);
        console.log("File contains approximately", rowCount, "rows");
        
        if (rowCount > MAX_ROWS) {
          toast.error(`Sorry, only files with up to ${MAX_ROWS} addresses are allowed for the sample report.`);
          setFileProcessingState("error");
          return;
        }
        
        console.log("Row count check passed, proceeding with submission");
        setFileProcessingState("uploading");
      } catch (countError) {
        console.error("Error counting rows:", countError);
        // Continue despite error but log it
        console.log("Continuing despite row count error");
      }
      
      // Attempt submission
      await submitContactForm(values);
    } catch (error) {
      console.error("Error in form submission:", error);
      setFileProcessingState("error");
    }
  }

  return (
    <Dialog 
      open={open} 
      onOpenChange={(newOpen) => {
        setOpen(newOpen);
        if (onOpenChange) {
          onOpenChange(newOpen);
        }
        if (!newOpen) {
          form.reset();
        }
      }}
    >
      <div id="contact-section" className="flex flex-col gap-4 w-full items-center py-8">
        <Button
          onClick={() => setOpen(true)}
          className="bg-[hsl(24,97%,40%)] hover:bg-[hsl(24,97%,35%)] text-white px-6 sm:px-8 py-6 text-base sm:text-lg rounded-full font-medium transition-colors duration-200 min-h-[3.5rem] w-full sm:w-auto"
        >
          Request a Sample Report
        </Button>
      </div>
      
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold mb-4">Request a Sample Report</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Upload address and postcodes to get a report on potential short term lettings.
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
            
            {isSettingUp ? (
              <div className="bg-blue-500/10 border border-blue-800 rounded p-3 flex items-center gap-2">
                <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
                <div className="text-blue-500 text-sm">Setting up storage system...</div>
              </div>
            ) : (
              <FileUploadField form={form} disabled={!setupComplete} />
            )}
            
            {error && (
              <div className="bg-red-500/10 border border-red-800 rounded p-3 flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div className="text-red-500 text-sm">{error}</div>
              </div>
            )}
            
            {!setupComplete && !isSettingUp && (
              <div className="bg-red-500/10 border border-red-800 rounded p-3 flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div className="text-red-500 text-sm">Storage setup failed. Please try again later.</div>
              </div>
            )}
            
            <Button 
              type="submit" 
              className="w-full" 
              disabled={isSubmitting || isSettingUp || !setupComplete}
            >
              {isSubmitting ? "Submitting..." : 
                isSettingUp ? "Setting up..." : 
                !setupComplete ? "Setup Required" : 
                "Submit Request"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
