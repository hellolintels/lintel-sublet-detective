
import { Shield } from "lucide-react";

const Logo = () => {
  return (
    <div className="flex items-center space-x-2">
      <Shield className="w-8 h-8 text-gray-400" />
      <span className="text-2xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
        lintels.in
      </span>
    </div>
  );
};

export default Logo;
