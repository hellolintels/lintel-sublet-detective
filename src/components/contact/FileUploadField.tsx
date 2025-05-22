
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Upload, FileCheck, AlertCircle } from "lucide-react";
import { UseFormReturn } from "react-hook-form";
import { ContactFormValues } from "./contact-form-schema";
import { useState } from "react";
import { MAX_ROWS } from "./contact-form-schema";
import { countFileRows } from "./file-utils";

interface FileUploadFieldProps {
  form: UseFormReturn<ContactFormValues>;
  disabled?: boolean;
}

export function FileUploadField({ form, disabled = false }: FileUploadFieldProps) {
  const [fileStatus, setFileStatus] = useState<"none" | "checking" | "valid" | "invalid">("none");
  const [fileError, setFileError] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    
    // Update form value
    form.onChange(e);
    
    // Reset status
    setFileStatus("checking");
    setFileError(null);
    
    if (!files || files.length === 0) {
      setFileStatus("none");
      return;
    }
    
    const file = files[0];
    console.log("File selected:", file.name, file.size);
    
    try {
      const rowCount = await countFileRows(file);
      console.log("File contains approximately", rowCount, "rows");
      
      if (rowCount > MAX_ROWS) {
        setFileStatus("invalid");
        setFileError(`File contains too many addresses (${rowCount}). Maximum allowed is ${MAX_ROWS}.`);
      } else {
        setFileStatus("valid");
      }
    } catch (error) {
      console.error("Error checking file:", error);
      setFileStatus("none");
    }
  };

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
                  console.log("File input change event");
                  handleFileChange(e);
                }}
                disabled={disabled}
                {...field}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 disabled:cursor-not-allowed"
              />
              <div className={`flex items-center justify-center w-full border-2 ${disabled ? 'border-gray-400' : fileStatus === 'invalid' ? 'border-red-300' : fileStatus === 'valid' ? 'border-green-300' : 'border-primary/50'} border-dashed rounded-lg p-4 ${disabled ? 'bg-gray-100' : fileStatus === 'invalid' ? 'bg-red-50' : fileStatus === 'valid' ? 'bg-green-50' : 'hover:bg-primary/5'} transition-colors`}>
                {fileStatus === 'valid' ? (
                  <FileCheck className="mr-2 text-green-500" />
                ) : fileStatus === 'invalid' ? (
                  <AlertCircle className="mr-2 text-red-500" />
                ) : (
                  <Upload className={`mr-2 ${disabled ? 'text-gray-400' : 'text-primary'}`} />
                )}
                <span className={`text-sm ${disabled ? 'text-gray-400' : fileStatus === 'invalid' ? 'text-red-500' : fileStatus === 'valid' ? 'text-green-600' : 'text-muted-foreground'}`}>
                  {value && (value as FileList).length > 0 
                    ? `Selected: ${(value as FileList)[0].name}${fileStatus === 'invalid' ? ' (Invalid)' : fileStatus === 'valid' ? ' (Valid)' : ''}`
                    : disabled
                      ? "Upload functionality unavailable"
                      : "Upload addresses (CSV or Excel)"}
                </span>
              </div>
            </div>
          </FormControl>
          <FormDescription className="text-center mt-1">
            CSV or Excel file with street addresses and postcodes (max {MAX_ROWS} rows)
          </FormDescription>
          {fileError && (
            <div className="text-sm text-red-500 mt-1 flex items-center">
              <AlertCircle className="h-4 w-4 mr-1" />
              {fileError}
            </div>
          )}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
