
import { Zap } from "lucide-react";

const Logo = () => {
  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <Zap className="h-6 w-6 text-lime-400" />
        <div className="absolute -inset-0.5 bg-lime-400 blur-sm opacity-50" />
      </div>
      <span className="text-2xl font-bold bg-gradient-to-r from-lime-300 to-lime-500 bg-clip-text text-transparent">
        lintels.in
      </span>
    </div>
  );
};

export default Logo;
