
import { Button } from "./ui/button";
import { Mail } from "lucide-react";

const Contact = () => {
  return (
    <div className="py-20 bg-black">
      <div className="container mx-auto px-4 text-center">
        <h2 className="text-3xl font-bold mb-6 text-white">
          Onboarding Now in Scotland
        </h2>
        <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
          We're currently working with selected agents and housing providers across Scotland.
          Beta onboarding is limited — if you manage rental properties and want to test Lintel, we'd love to hear from you.
        </p>
        <div className="flex flex-col items-center space-y-4">
          <Button className="bg-gray-700 hover:bg-gray-600 text-white px-8 py-6 text-lg">
            <Mail className="mr-2" />
            Contact Us to Learn More
          </Button>
          <div className="text-gray-300">
            <p>📩 hello@lintel.tech</p>
            <p>🌐 www.lintel.tech</p>
            <p>📍 Based in Glasgow, operating across Scotland</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Contact;
