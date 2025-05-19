
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Upload } from "lucide-react";
import { UseFormReturn } from "react-hook-form";
import { ContactFormValues } from "./contact-form-schema";

interface FileUploadFieldProps {
  form: UseFormReturn<ContactFormValues>;
  disabled?: boolean;
}

export function FileUploadField({ form, disabled = false }: FileUploadFieldProps) {
  return (
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
                disabled={disabled}
                {...field}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 disabled:cursor-not-allowed"
              />
              <div className={`flex items-center justify-center w-full border-2 ${disabled ? 'border-gray-400' : 'border-primary/50'} border-dashed rounded-lg p-4 ${disabled ? 'bg-gray-100' : 'hover:bg-primary/5'} transition-colors`}>
                <Upload className={`mr-2 ${disabled ? 'text-gray-400' : 'text-primary'}`} />
                <span className={`text-sm ${disabled ? 'text-gray-400' : 'text-muted-foreground'}`}>
                  {value && (value as FileList).length > 0 
                    ? `Selected: ${(value as FileList)[0].name}`
                    : disabled
                      ? "Upload functionality unavailable"
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
  );
}
