
import { useState } from "react";
import { Button } from "./ui/button";
import { ContactForm } from "./ContactForm";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const ApplyForBeta = () => {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button 
        size="lg"
        className="bg-[hsl(24,97%,40%)] hover:bg-[hsl(24,97%,35%)] text-white px-8 py-4 text-lg rounded-full font-medium transition-colors duration-200"
        onClick={() => setOpen(true)}
      >
        Apply for Beta Access
      </Button>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold mb-4">Apply for Beta Access</DialogTitle>
        </DialogHeader>
        <p className="mb-4 text-muted-foreground">
          Please provide your details below to apply for beta access to the platform. 
          We'll review your application and get back to you shortly.
        </p>
        <ContactForm formType="beta" onOpenChange={setOpen} />
      </DialogContent>
    </Dialog>
  );
};

export default ApplyForBeta;
