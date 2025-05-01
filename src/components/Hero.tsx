
import { Button } from "./ui/button";

const Hero = () => {
  const scrollToContact = () => {
    const contactSection = document.getElementById('contact-section');
    if (contactSection) {
      contactSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="relative w-full min-h-[calc(100vh-4rem)] flex items-center justify-center bg-gradient-to-b from-black to-gray-900 pt-20 px-4 sm:px-6">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient_stops))] from-gray-800/20 via-black to-black"></div>
      <div className="container mx-auto relative z-10">
        <div className="text-center max-w-4xl mx-auto">
          <h1 className="text-2xl sm:text-4xl md:text-6xl font-bold mb-6 sm:mb-8 bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent leading-tight pb-2">
            Protect your rental portfolio.<br className="hidden sm:block" /> Detect unauthorised subletting early.
          </h1>
          <p className="text-sm sm:text-base md:text-xl text-gray-300 mb-8 sm:mb-10 leading-relaxed max-w-3xl mx-auto mt-2">
            lintels.in helps agents, landlords and housing providers across the UK detect illegal short-term subletting across their rental portfolios.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8 sm:mt-10">
            <Button
              size="lg"
              className="w-full sm:w-auto bg-[hsl(24,97%,40%)] hover:bg-[hsl(24,97%,35%)] text-white px-6 sm:px-8 py-6 text-base sm:text-lg rounded-full font-medium transition-colors duration-200 min-h-[3.5rem]"
              onClick={scrollToContact}
            >
              Request a Sample Report
            </Button>
            <Button
              size="lg"
              className="w-full sm:w-auto bg-[#8B5CF6] hover:bg-[#7C3AED] text-white px-6 sm:px-8 py-6 text-base sm:text-lg rounded-full font-medium transition-colors duration-200 min-h-[3.5rem]"
              onClick={scrollToContact}
            >
              Apply for Beta Access
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Hero;
