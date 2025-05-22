
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { ContactFormHeader } from "./ContactFormHeader";
import { ContactFormContainer } from "./ContactFormContainer";

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
  
  useEffect(() => {
    // Initialize with defaultOpen value
    if (defaultOpen) {
      setOpen(true);
    }
  }, [defaultOpen]);
  
  // Handle form success
  const handleSuccess = () => {
    if (onOpenChange) {
      onOpenChange(false);
    }
    setOpen(false);
  };

  return (
    <Dialog 
      open={open} 
      onOpenChange={(newOpen) => {
        setOpen(newOpen);
        if (onOpenChange) {
          onOpenChange(newOpen);
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
        <ContactFormHeader />
        <ContactFormContainer 
          formType={formType}
          setupComplete={setupComplete}
          isSettingUp={isSettingUp}
          onSuccess={handleSuccess}
        />
      </DialogContent>
    </Dialog>
  );
}
