
import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";
import Logo from "./Logo";
import { useAuth } from "@/contexts/AuthContext";

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user } = useAuth();
  const location = useLocation();

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

  return (
    <nav className="bg-black/90 backdrop-blur-sm text-white fixed w-full z-50 border-b border-orange-500/20">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="flex items-center space-x-2">
            <Logo />
            <span className="text-xl font-bold text-orange-500">Lintels</span>
          </Link>
          
          <div className="hidden md:flex items-center space-x-8">
            <Link to="/" className="hover:text-orange-500 transition-colors">
              Home
            </Link>
            <Link to="/test-pipeline" className="hover:text-orange-500 transition-colors">
              Test Pipeline
            </Link>
            {user ? (
              <>
                <Link to="/dashboard" className="hover:text-orange-500 transition-colors">
                  Dashboard
                </Link>
                <Link to="/admin" className="hover:text-orange-500 transition-colors">
                  Admin
                </Link>
              </>
            ) : (
              <Link to="/login" className="hover:text-orange-500 transition-colors">
                Login
              </Link>
            )}
          </div>
          
          <button
            onClick={toggleMenu}
            className="md:hidden text-white hover:text-orange-500 transition-colors"
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
        
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-orange-500/20">
            <div className="flex flex-col space-y-4">
              <Link 
                to="/" 
                className="hover:text-orange-500 transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                Home
              </Link>
              <Link 
                to="/test-pipeline" 
                className="hover:text-orange-500 transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                Test Pipeline
              </Link>
              {user ? (
                <>
                  <Link 
                    to="/dashboard" 
                    className="hover:text-orange-500 transition-colors"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Dashboard
                  </Link>
                  <Link 
                    to="/admin" 
                    className="hover:text-orange-500 transition-colors"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Admin
                  </Link>
                </>
              ) : (
                <Link 
                  to="/login" 
                  className="hover:text-orange-500 transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Login
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
