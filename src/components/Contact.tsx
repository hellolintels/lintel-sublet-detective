
import { useEffect, useState } from "react";
import { ContactForm } from "./contact/ContactForm";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const Contact = () => {
  const [setupComplete, setSetupComplete] = useState(false);
  const [isSettingUp, setIsSettingUp] = useState(false);

  useEffect(() => {
    const runSetup = async () => {
      try {
        setIsSettingUp(true);
        // Call the setup function to ensure storage buckets exist
        console.log("Calling setup function...");
        const { data, error } = await supabase.functions.invoke("setup");
        
        if (error) {
          console.error("Setup function error:", error);
          toast.error("Storage setup issue. Please try again later.");
          setSetupComplete(false);
        } else {
          console.log("Setup completed successfully:", data);
          setSetupComplete(true);
        }
      } catch (error) {
        console.error("Error running setup:", error);
        toast.error("System initialization failed. Please try again later.");
        setSetupComplete(false);
      } finally {
        setIsSettingUp(false);
      }
    };

    runSetup();
  }, []);

  return (
    <div className="w-full py-12 sm:py-16 md:py-24 px-4 sm:px-6" id="contact-section">
      <div className="container mx-auto flex flex-col items-center">
        <div className="font-sans w-full max-w-xl flex flex-col items-center mb-6 sm:mb-8 md:mb-10">
          <div className="flex items-center text-white mb-2">
            <span className="text-xl sm:text-2xl md:text-3xl font-semibold tracking-tight">
              Try lintels.in For Free
            </span>
          </div>
          <p className="text-base sm:text-lg text-white mb-4 font-normal text-center">
            Upload your addresses to receive a free sample report that matches your list to potential sublets
          </p>
          <div className="flex flex-col w-full items-center">
            <ContactForm defaultOpen={true} setupComplete={setupComplete} isSettingUp={isSettingUp} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Contact;
