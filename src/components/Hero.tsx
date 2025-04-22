
import { Button } from "./ui/button";

const Hero = () => {
  return (
    <div className="relative min-h-screen flex items-center justify-center bg-gradient-to-b from-black to-gray-900 pt-16">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient_stops))] from-gray-800/20 via-black to-black"></div>
      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
            Protect your properties from unauthorised subletting
          </h1>
          <p className="text-xl text-gray-300 mb-8 leading-relaxed">
            lintels.in helps agents, landlords and housing providers across the UK detect illegal short-term subletting across their rental portfolios — discreetly and automatically.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button className="bg-gray-700 hover:bg-gray-600 text-white px-8 py-6 text-lg w-full sm:w-auto">
              Contact Us
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Hero;
