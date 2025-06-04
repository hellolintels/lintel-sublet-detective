
import { UseFormReturn } from "react-hook-form";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import { ContactFormValues, ORGANIZATION_TYPES } from "./contact-form-schema";

interface OrganizationTypeFieldProps {
  form: UseFormReturn<ContactFormValues>;
}

export function OrganizationTypeField({ form }: OrganizationTypeFieldProps) {
  const organizationType = form.watch("organizationType");

  return (
    <>
      <FormField
        control={form.control}
        name="organizationType"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Organization Type</FormLabel>
            <FormControl>
              <RadioGroup
                onValueChange={field.onChange}
                value={field.value}
                className="flex flex-col space-y-2"
              >
                {ORGANIZATION_TYPES.map((type) => (
                  <div key={type} className="flex items-center space-x-2">
                    <RadioGroupItem value={type} id={type} />
                    <label
                      htmlFor={type}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {type}
                    </label>
                  </div>
                ))}
              </RadioGroup>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      
      {organizationType === "Other" && (
        <FormField
          control={form.control}
          name="organizationOther"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Please specify</FormLabel>
              <FormControl>
                <Input 
                  placeholder="Specify organization type" 
                  maxLength={18}
                  {...field} 
                />
              </FormControl>
              <div className="text-xs text-gray-500">
                {field.value?.length || 0}/18 characters
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
      )}
    </>
  );
}
