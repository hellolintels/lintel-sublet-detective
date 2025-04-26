
import { Check } from "lucide-react";

const features = [
  {
    title: "Daily Monitoring",
    description: "We run automated searches daily across the biggest subletting platforms to scan your portfolio."
  },
  {
    title: "Evidence-Based Matching",
    description: "Our reports include direct links to potential sublets — with enough detail to support internal investigation or escalation."
  },
  {
    title: "Simple Reporting",
    description: "You receive a clear spreadsheet-style summary with everything you need — no platform to log into or dashboard to manage."
  },
  {
    title: "Low Uplift, High Impact",
    description: "No setup. No technical onboarding. Just send us addresses and receive results."
  },
  {
    title: "Risk Mitigation",
    description: "Support compliance and legal investigations. Helps prove you're actively managing subletting risk."
  },
  {
    title: "Private & Secure",
    description: "No tenant information is shared or stored. We operate as a neutral third party."
  }
];

const Features = () => {
  return (
    <div className="py-8 sm:py-12 md:py-20 bg-black font-sans">
      <div className="container mx-auto px-4">
        <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-center mb-6 sm:mb-8 md:mb-12 text-white">
          Features
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
          {features.map((feature, index) => (
            <div 
              key={index} 
              className="p-4 sm:p-6 rounded-lg bg-gray-900/50 backdrop-blur-sm border border-gray-800"
            >
              <div className="flex items-start space-x-3 mb-2 sm:mb-3">
                <Check className="w-5 h-5 text-gray-400 flex-shrink-0 mt-1" />
                <h3 className="text-base sm:text-lg font-semibold text-white">{feature.title}</h3>
              </div>
              <p className="text-sm sm:text-base text-gray-300 leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Features;
