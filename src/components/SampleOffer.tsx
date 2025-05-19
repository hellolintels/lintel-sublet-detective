
import { Info, MailPlus } from "lucide-react";
import { Button } from "./ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";

const SampleOffer = () => {
  // Scroll to contact section on click
  const handleClick = () => {
    const contactSection = document.getElementById("contact-section");
    if (contactSection) {
      contactSection.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  return (
    <section className="flex justify-center items-center py-12 bg-black">
      <div className="font-sans max-w-xl w-full flex flex-col items-center rounded-2xl bg-gradient-to-r from-[#9b87f5]/30 via-[#7E69AB]/30 to-[#8B5CF6]/40 border border-[#9b87f5] p-8 shadow-lg animate-fade-in">
        <div className="flex items-center text-[#9b87f5] mb-2">
          <MailPlus className="w-7 h-7 mr-2" />
          <span className="text-xl font-semibold tracking-tight" style={{ fontFamily: 'Roboto, Inter, sans-serif' }}>
            Sample Address Test Available
          </span>
        </div>
        <p className="text-lg text-white mb-5 font-normal text-center" style={{ fontFamily: 'Roboto, Inter, sans-serif' }}>
          See exactly how lintels.in works — request a free sample scan and receive anonymised data for a demo address.
        </p>
        <div className="flex items-center gap-2">
          <Button
            size="lg"
            className="bg-[hsl(24,97%,40%)] hover:bg-[hsl(24,97%,35%)] text-white px-8 py-4 text-lg rounded-full font-medium transition-colors duration-200"
            onClick={handleClick}
          >
            <MailPlus className="mr-2" />
            Request a Sample Report
          </Button>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Info className="w-5 h-5 text-[#9b87f5]" />
              </TooltipTrigger>
              <TooltipContent className="bg-gray-900 text-white border-gray-800">
                <p>You will receive your sample report by email provided 48 hours after submission</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    </section>
  );
};

export default SampleOffer;
