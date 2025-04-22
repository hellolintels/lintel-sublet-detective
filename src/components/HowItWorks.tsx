
import { Check } from "lucide-react";

const steps = [
  {
    number: "01",
    title: "You send us your property list",
    description: "Upload a simple list of your known tenanted properties — just addresses and postcodes. No sensitive tenant data required."
  },
  {
    number: "02",
    title: "We scan major short-let platforms",
    description: "We run automated searches daily across the most active subletting platforms to detect listings that match your properties."
  },
  {
    number: "03",
    title: "We match listings to your portfolio",
    description: "Using proprietary detection techniques, we identify likely matches between your properties and potential short-term lets."
  },
  {
    number: "04",
    title: "You receive a report",
    description: "We send you a secure, easy-to-review report with links to flagged listings so you can take further action internally if needed."
  }
];

const HowItWorks = () => {
  return (
    <div className="py-20 bg-gradient-to-b from-black to-gray-900">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold text-center mb-12 text-white">
          How It Works
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step) => (
            <div key={step.number} className="relative p-6 rounded-lg bg-gray-900/50 backdrop-blur-sm border border-gray-800">
              <div className="text-4xl font-bold text-gray-700 mb-4">
                {step.number}
              </div>
              <h3 className="text-xl font-semibold mb-3 text-white">
                {step.title}
              </h3>
              <p className="text-gray-300">{step.description}</p>
            </div>
          ))}
        </div>
        <p className="text-gray-300 text-center mt-8 text-lg">
          No integrations. No learning curve. Just results.
        </p>
      </div>
    </div>
  );
};

export default HowItWorks;
