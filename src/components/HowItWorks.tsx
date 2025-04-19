
const steps = [
  {
    number: "01",
    title: "Provide Property List",
    description: "Share your list of tenanted properties with us"
  },
  {
    number: "02",
    title: "Monthly Scans",
    description: "We run comprehensive scans against short-let platforms"
  },
  {
    number: "03",
    title: "Clear Reports",
    description: "Receive easy-to-review reports of potential matches"
  },
  {
    number: "04",
    title: "Take Action",
    description: "You decide how to follow up on identified cases"
  }
];

const HowItWorks = () => {
  return (
    <div className="py-20 bg-gradient-to-b from-gray-900 to-gray-800">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold text-center mb-12 text-white">
          How It Works
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step) => (
            <div key={step.number} className="relative">
              <div className="text-5xl font-bold text-purple-500/20 mb-4">
                {step.number}
              </div>
              <h3 className="text-xl font-semibold mb-3 text-white">
                {step.title}
              </h3>
              <p className="text-gray-300">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default HowItWorks;
