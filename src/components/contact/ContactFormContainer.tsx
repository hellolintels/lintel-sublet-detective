
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { contactFormSchema, ContactFormValues } from "./contact-form-schema";
import { useContactFormSubmit } from "./hooks/use-contact-form-submit";
import { ContactFormFields } from "./ContactFormFields";
import { ErrorIndicator, SetupStatusIndicator } from "./StatusIndicators";

interface ContactFormContainerProps {
  formType?: string;
  setupComplete?: boolean;
  isSettingUp?: boolean;
  onSuccess: () => void;
}

export function ContactFormContainer({ 
  formType = "sample", 
  setupComplete = false,
  isSettingUp = false,
  onSuccess 
}: ContactFormContainerProps) {
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

  const { isSubmitting, error, submitContactForm } = useContactFormSubmit(formType, onSuccess);

  async function onSubmit(values: ContactFormValues) {
    if (!setupComplete && !isSettingUp) {
      // Don't submit if setup isn't complete
      return;
    }
    
    await submitContactForm(values);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <ContactFormFields 
          form={form} 
          setupComplete={setupComplete} 
          isSettingUp={isSettingUp} 
        />
        
        <ErrorIndicator error={error} />
        
        <SetupStatusIndicator 
          setupComplete={setupComplete} 
          isSettingUp={isSettingUp} 
        />
        
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
  );
}
