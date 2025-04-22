
import { Check } from "lucide-react";

const features = [
  {
    title: "Monthly Monitoring",
    description: "Your portfolio is scanned each month against the biggest subletting platforms."
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
    description: "Supports eviction processes, legal reviews, and compliance investigations. Helps prove you're actively managing subletting risk."
  },
  {
    title: "Private & Secure",
    description: "No tenant information is shared or stored. Lintel operates as a neutral third party."
  },
  {
    title: "Sample Address Test Available",
    description: "We offer sample data so you can see how the system works before you commit."
  }
];

const Features = () => {
  return (
    <div className="py-20 bg-black">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold text-center mb-12 text-white">
          Features
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div 
              key={index} 
              className={`p-6 rounded-lg bg-gray-900/50 backdrop-blur-sm border border-gray-800 ${index === features.length - 1 ? 'md:col-start-2 lg:col-start-auto' : ''}`}
            >
              <div className="flex items-start space-x-3 mb-4">
                <Check className="w-6 h-6 text-gray-400 flex-shrink-0 mt-1" />
                <h3 className="text-xl font-semibold text-white">{feature.title}</h3>
              </div>
              <p className="text-gray-300">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Features;
