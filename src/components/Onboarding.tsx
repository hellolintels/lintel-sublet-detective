
import { Button } from "./ui/button";

const Onboarding = () => {
  const scrollToContact = () => {
    const contactSection = document.getElementById('contact-section');
    if (contactSection) {
      contactSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div id="onboarding-section" className="w-full py-12 sm:py-16 md:py-24 bg-gradient-to-b from-gray-900 to-black px-4 sm:px-6">
      <div className="container mx-auto max-w-4xl text-center">
        <h2 className="text-xl sm:text-2xl md:text-3xl font-bold mb-6 sm:mb-8 text-white">
          Onboarding Across the UK
        </h2>
        <div className="text-gray-300 text-sm sm:text-base md:text-lg mb-8">
          <p className="mb-4">
            We're currently working with selected agents and housing providers across the UK. 
            If you manage rental properties and want to test 
            lintels.in, fill out the sample report form and we'll get back to you with a report.
          </p>
        </div>
        <Button
          onClick={scrollToContact}
          className="bg-[hsl(24,97%,40%)] hover:bg-[hsl(24,97%,35%)] text-white px-6 sm:px-8 py-6 text-base sm:text-lg rounded-full font-medium transition-colors duration-200 min-h-[3.5rem] w-full sm:w-auto"
        >
          Request a Sample Report
        </Button>
      </div>
    </div>
  );
};

export default Onboarding;
