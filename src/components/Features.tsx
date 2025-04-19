
import { Shield, Users, FileText, Search } from "lucide-react";

const Features = () => {
  const features = [
    {
      icon: Search,
      title: "Targeted Scanning",
      description: "Our system scans the largest short-let platforms monthly to flag listings that match your properties."
    },
    {
      icon: Shield,
      title: "Risk Protection",
      description: "Reduce reputational, legal, and compliance risks with early detection of unauthorised subletting."
    },
    {
      icon: FileText,
      title: "Simple Reports",
      description: "Receive clear, easy-to-review reports of potential matches with direct links to suspected listings."
    },
    {
      icon: Users,
      title: "Built for Property Professionals",
      description: "Designed for letting agents, housing associations, and institutional landlords."
    }
  ];

  return (
    <div className="py-20 bg-black">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold text-center mb-12 text-white">
          Why Subletting Matters
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <div key={index} className="p-6 rounded-lg bg-gray-900/50 backdrop-blur-sm border border-gray-800">
              <feature.icon className="w-10 h-10 text-gray-400 mb-4" />
              <h3 className="text-xl font-semibold mb-3 text-white">{feature.title}</h3>
              <p className="text-gray-300">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Features;
