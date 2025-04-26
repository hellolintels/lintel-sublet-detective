
const steps = [
  {
    number: "01",
    title: "Setup Your Portfolio",
    description: "Send us your property addresses through our secure portal - we handle everything else."
  },
  {
    number: "02",
    title: "Daily Monitoring",
    description: "Our system runs automated searches across major subletting platforms to identify potential matches."
  },
  {
    number: "03",
    title: "Evidence Collection",
    description: "When we find a match, we capture detailed evidence including screenshots, links and listing details."
  },
  {
    number: "04",
    title: "Receive Reports",
    description: "Get clear, actionable reports with all the evidence you need to take appropriate action."
  }
];

const HowItWorks = () => {
  return (
    <div className="py-8 sm:py-12 md:py-20 bg-gradient-to-b from-black to-gray-900">
      <div className="container mx-auto px-4">
        <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-center mb-6 sm:mb-8 md:mb-12 text-white">
          How It Works
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 md:gap-8">
          {steps.map((step) => (
            <div key={step.number} className="relative p-4 sm:p-6 rounded-lg bg-gray-900/50 backdrop-blur-sm border border-gray-800">
              <div className="text-2xl sm:text-3xl font-bold text-gray-700 mb-3">
                {step.number}
              </div>
              <h3 className="text-base sm:text-lg font-semibold mb-2 text-white">
                {step.title}
              </h3>
              <p className="text-sm sm:text-base text-gray-300 leading-relaxed">{step.description}</p>
            </div>
          ))}
        </div>
        <p className="text-sm sm:text-base text-gray-300 text-center mt-6 sm:mt-8">
          No integrations. No learning curve. Just results.
        </p>
      </div>
    </div>
  );
};

export default HowItWorks;
