import { Button } from "./ui/button";
import { Mail, Download } from "lucide-react";
import { ContactForm } from "./ContactForm";

const Contact = () => {
  const handleEmailClick = () => {
    window.location.href = "mailto:jamie@lintels.in";
  };

  return (
    <div className="py-12 sm:py-16 md:py-24 bg-black px-4 sm:px-6" id="contact-section">
      <div className="container mx-auto flex flex-col items-center text-center">
        <div className="font-sans w-full max-w-xl flex flex-col items-center rounded-2xl mb-6 sm:mb-8 md:mb-10 bg-gradient-to-r from-[hsl(24,97%,40%,0.3)] via-[hsl(24,90%,50%,0.3)] to-[hsl(24,100%,40%,0.4)] border border-[hsl(24,97%,40%)] p-4 sm:p-6 md:p-8 shadow-lg animate-fade-in">
          <div className="flex items-center text-[hsl(24,97%,40%)] mb-2">
            <span className="text-base sm:text-lg md:text-xl font-semibold tracking-tight">
              Try lintels.in For Free
            </span>
          </div>
          <p className="text-sm sm:text-base text-white mb-4 font-normal text-center">
            Request a free sample scan and receive a report of up to <span className="text-[hsl(24,97%,40%)] font-bold">20 addresses</span> from your portfolio.
          </p>
          <div className="flex flex-col gap-4 w-full items-center">
            <ContactForm />
            <Button 
              variant="outline"
              size="lg"
              className="bg-white hover:bg-gray-100 text-black border-gray-300 w-full sm:w-auto"
              onClick={() => window.open("https://workspace.google.com/marketplace/app/lintelsin/123456789", "_blank")}
            >
              <Download className="mr-2" />
              Install Google Workspace Add-on
            </Button>
          </div>
        </div>
        
        <h2 className="text-xl sm:text-2xl md:text-3xl font-bold mb-4 sm:mb-6 text-white">
          Onboarding Across the UK
        </h2>
        <p className="text-sm sm:text-base text-gray-300 mb-6 sm:mb-8 max-w-2xl mx-auto">
          We're currently working with selected agents and housing providers across the United Kingdom.
          Beta onboarding is limited — if you manage rental properties and want to test lintels.in, we'd love to hear from you.
        </p>
        <div className="flex flex-col items-center w-full sm:w-auto">
          <Button 
            className="w-full sm:w-auto bg-gray-700 hover:bg-gray-600 text-white px-4 sm:px-6 py-3 sm:py-4 text-sm sm:text-base min-h-[3rem]"
            onClick={handleEmailClick}
          >
            <Mail className="mr-2" />
            Contact Us to Learn More
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Contact;
