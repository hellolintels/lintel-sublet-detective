
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useState, useEffect } from "react";
import { contactFormSchema, ContactFormValues } from "./contact-form-schema";
import { useContactFormSubmit } from "./use-contact-form-submit";
import { FileUploadField } from "./FileUploadField";

interface ContactFormProps {
  onOpenChange?: (open: boolean) => void;
  formType?: string;
}

export function ContactForm({ onOpenChange, formType = "sample" }: ContactFormProps) {
  const [open, setOpen] = useState(false);
  
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

  const { isSubmitting, submitContactForm } = useContactFormSubmit(formType, () => {
    if (onOpenChange) {
      onOpenChange(false);
    }
    setOpen(false);
    form.reset();
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

  async function onSubmit(values: ContactFormValues) {
    await submitContactForm(values);
  }

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
              
              <FileUploadField form={form} />
              
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
