
import { Copyright, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";

const Footer = () => {
  return (
    <footer className="w-full bg-black text-gray-300 py-8 border-t border-gray-800">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center space-y-6 md:space-y-0">
          <div className="text-sm space-y-2">
            <p>Registered in Scotland</p>
            <p>Company Number: SC845999</p>
            <p>Registered Office: 169 West George Street, Glasgow, G2 2LB</p>
            <p className="flex items-center mt-4">
              <Copyright className="w-4 h-4 mr-2" />
              2025 lintels.in . All rights reserved.
            </p>
          </div>
          
          <Button
            variant="ghost"
            className="text-gray-300 hover:text-[hsl(24,97%,40%)] hover:bg-transparent transition-colors"
            onClick={() => window.location.href = "mailto:support@lintels.in"}
          >
            <Mail className="mr-2 h-4 w-4" />
            Contact Us
          </Button>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
