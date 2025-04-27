
import Logo from "./Logo";
import { Button } from "./ui/button";
import { Menu } from "lucide-react";
import { useState, useEffect } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Link } from "react-router-dom";

const Navbar = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const isMobile = useIsMobile();
  
  useEffect(() => {
    if (!isMobile) {
      setMenuOpen(false);
    }
  }, [isMobile]);
  
  const scrollToSection = (sectionId: string) => {
    const section = document.getElementById(sectionId);
    if (section) {
      section.scrollIntoView({ behavior: 'smooth' });
      setMenuOpen(false);
    }
  };

  return (
    <nav className="fixed top-0 w-full z-50 backdrop-blur-lg bg-black/50 border-b border-gray-800">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center">
            <Logo />
          </Link>
          
          {isMobile ? (
            <>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setMenuOpen(!menuOpen)}
                className="text-gray-300 hover:text-white"
                aria-label="Toggle menu"
              >
                <Menu className="h-6 w-6" />
              </Button>
              
              {menuOpen && (
                <div className="absolute top-16 left-0 right-0 bg-black/90 border-b border-gray-800 py-4 px-4">
                  <div className="flex flex-col space-y-2">
                    <Button 
                      variant="ghost" 
                      className="text-gray-300 hover:text-white w-full justify-start text-left"
                      onClick={() => scrollToSection('how-it-works')}
                    >
                      How it Works
                    </Button>
                    <Button 
                      variant="ghost" 
                      className="text-gray-300 hover:text-white w-full justify-start text-left"
                      onClick={() => scrollToSection('features-section')}
                    >
                      Features
                    </Button>
                    <Button 
                      variant="ghost" 
                      className="text-gray-300 hover:text-white w-full justify-start text-left"
                      onClick={() => scrollToSection('contact-section')}
                    >
                      Contact
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex items-center space-x-4">
              <Button 
                variant="ghost" 
                className="text-gray-300 hover:text-white"
                onClick={() => scrollToSection('how-it-works')}
              >
                How it Works
              </Button>
              <Button 
                variant="ghost" 
                className="text-gray-300 hover:text-white"
                onClick={() => scrollToSection('features-section')}
              >
                Features
              </Button>
              <Button 
                variant="ghost" 
                className="text-gray-300 hover:text-white"
                onClick={() => scrollToSection('contact-section')}
              >
                Contact
              </Button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
