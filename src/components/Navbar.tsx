
import Logo from "./Logo";
import { Button } from "./ui/button";

const Navbar = () => {
  return (
    <nav className="fixed top-0 w-full z-50 backdrop-blur-lg bg-gray-900/50 border-b border-gray-800">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Logo />
          <div className="flex items-center space-x-4">
            <Button variant="ghost" className="text-gray-300 hover:text-white">
              How it Works
            </Button>
            <Button variant="ghost" className="text-gray-300 hover:text-white">
              Features
            </Button>
            <Button variant="secondary" className="bg-purple-600 hover:bg-purple-700 text-white">
              Contact Us
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
