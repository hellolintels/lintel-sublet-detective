
import { Copyright } from "lucide-react";

const Footer = () => {
  return (
    <footer className="w-full bg-black text-gray-300 py-8 border-t border-gray-800">
      <div className="container mx-auto px-4">
        <div className="flex flex-col items-start space-y-4">
          <div className="text-sm space-y-2">
            <p>Registered in Scotland</p>
            <p>Company Number: SC845999</p>
            <p>Registered Office: 169 West George Street, Glasgow, G2 2LB</p>
          </div>
          <p className="text-sm flex items-center">
            <Copyright className="w-4 h-4 mr-2" />
            2025 lintels.in . All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
