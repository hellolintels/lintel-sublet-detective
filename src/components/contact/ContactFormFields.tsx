
import { UseFormReturn } from "react-hook-form";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { ContactFormValues } from "./contact-form-schema";
import { FileUploadField } from "./FileUploadField";
import { Loader2 } from "lucide-react";

interface ContactFormFieldsProps {
  form: UseFormReturn<ContactFormValues>;
  setupComplete: boolean;
  isSettingUp: boolean;
}

export function ContactFormFields({ form, setupComplete, isSettingUp }: ContactFormFieldsProps) {
  return (
    <>
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
    </>
  );
}
