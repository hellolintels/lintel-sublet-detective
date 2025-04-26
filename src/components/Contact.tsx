
import { Button } from "./ui/button";
import { Mail, MailPlus } from "lucide-react";

const Contact = () => {
  // Scroll-to-contact logic for the offer button (no-op inside this section, but handy if reused)
  const handleOfferClick = () => {
    const contactSection = document.getElementById("contact-section");
    if (contactSection) {
      contactSection.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  return (
    <div className="py-20 bg-black" id="contact-section">
      <div className="container mx-auto px-4 flex flex-col items-center text-center">
        {/* Sample Offer Highlight Callout */}
        <div
          className="font-sans w-full max-w-xl flex flex-col items-center rounded-2xl mb-10 bg-gradient-to-r from-[hsl(90,50%,40%,0.3)] via-[hsl(90,30%,50%,0.3)] to-[hsl(90,70%,40%,0.4)] border border-[hsl(90,70%,40%)] p-8 shadow-lg animate-fade-in"
          style={{ fontFamily: 'Roboto, Inter, sans-serif' }}
        >
          <div className="flex items-center text-[hsl(90,70%,40%)] mb-2">
            <MailPlus className="w-7 h-7 mr-2" />
            <span className="text-xl font-semibold tracking-tight">
              Try lintels.in For Free
            </span>
          </div>
          <p className="text-lg text-white mb-5 font-normal text-center">
            Request a free sample scan and receive a report of up to <span className="text-[hsl(90,70%,40%)] font-bold">20 addresses</span> from your portfolio.
          </p>
          <Button
            size="lg"
            className="bg-[hsl(90,70%,40%)] hover:bg-[hsl(90,70%,35%)] text-white px-8 py-4 text-lg rounded-full font-medium transition-colors duration-200"
            onClick={handleOfferClick}
          >
            <MailPlus className="mr-2" />
            Request a Sample Report
          </Button>
        </div>
        {/* Main Contact Content */}
        <h2 className="text-3xl font-bold mb-6 text-white">
          Onboarding Across the UK
        </h2>
        <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
          We're currently working with selected agents and housing providers across the United Kingdom.
          Beta onboarding is limited — if you manage rental properties and want to test lintels.in, we'd love to hear from you.
        </p>
        <div className="flex flex-col items-center space-y-4">
          <Button className="bg-gray-700 hover:bg-gray-600 text-white px-8 py-6 text-lg">
            <Mail className="mr-2" />
            Contact Us to Learn More
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Contact;
