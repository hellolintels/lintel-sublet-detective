
import React, { useState } from "react";
import { Link, NavLink as RouterNavLink } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import Logo from "@/components/Logo";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const isMobile = useIsMobile();
  const { isAuthenticated, user } = useAuth();
  const isAdmin = user?.email === "jamie@lintels.in";

  // Function to scroll to contact section
  const scrollToContact = () => {
    const contactSection = document.getElementById('contact-section');
    if (contactSection) {
      contactSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 px-4 bg-black border-b border-gray-800">
      <div className="container mx-auto">
        <div className="flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center space-x-2">
            <Logo />
          </Link>
          
          <nav className="hidden md:flex items-center space-x-6">
            <RouterNavLink 
              to="/" 
              className={({ isActive }) => cn(
                "hover:text-[hsl(24,97%,40%)] transition-colors",
                isActive && "font-bold text-[hsl(24,97%,40%)]"
              )}
            >
              Home
            </RouterNavLink>
            
            {isAuthenticated && (
              <>
                <RouterNavLink 
                  to="/dashboard"
                  className={({ isActive }) => cn(
                    "hover:text-[hsl(24,97%,40%)] transition-colors",
                    isActive && "font-bold text-[hsl(24,97%,40%)]"
                  )}
                >
                  Dashboard
                </RouterNavLink>
                
                {isAdmin && (
                  <RouterNavLink 
                    to="/admin"
                    className={({ isActive }) => cn(
                      "hover:text-[hsl(24,97%,40%)] transition-colors",
                      isActive && "font-bold text-[hsl(24,97%,40%)]"
                    )}
                  >
                    Admin
                  </RouterNavLink>
                )}
              </>
            )}
            
            {!isAuthenticated ? (
              <button 
                onClick={scrollToContact}
                className="rounded-md px-3.5 py-2.5 text-sm font-semibold bg-[hsl(24,97%,40%)] text-white hover:bg-[hsl(24,97%,35%)] transition-colors"
              >
                Contact
              </button>
            ) : (
              <Link
                to="/dashboard"
                className="rounded-md px-3.5 py-2.5 text-sm font-semibold bg-[hsl(24,97%,40%)] text-white hover:bg-[hsl(24,97%,35%)] transition-colors"
              >
                Dashboard
              </Link>
            )}
          </nav>
          
          {/* Mobile menu button */}
          <button 
            className="md:hidden p-2" 
            onClick={() => setIsOpen(!isOpen)}
            aria-label="Toggle menu"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-6 h-6 text-white">
              {isOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>
      
      {/* Mobile menu */}
      {isOpen && isMobile && (
        <div className="md:hidden p-4 border-t border-gray-800 bg-black">
          <div className="flex flex-col space-y-4">
            <Link 
              to="/" 
              onClick={() => setIsOpen(false)}
              className="block px-4 py-2 text-white hover:bg-gray-900 border-b border-gray-800"
            >
              Home
            </Link>
            
            {isAuthenticated && (
              <>
                <Link 
                  to="/dashboard" 
                  onClick={() => setIsOpen(false)}
                  className="block px-4 py-2 text-white hover:bg-gray-900 border-b border-gray-800"
                >
                  Dashboard
                </Link>
                
                {isAdmin && (
                  <Link 
                    to="/admin" 
                    onClick={() => setIsOpen(false)}
                    className="block px-4 py-2 text-white hover:bg-gray-900 border-b border-gray-800"
                  >
                    Admin
                  </Link>
                )}
              </>
            )}
            
            {!isAuthenticated ? (
              <button 
                onClick={() => {
                  setIsOpen(false);
                  setTimeout(() => scrollToContact(), 100);
                }}
                className="rounded-md px-3.5 py-2.5 text-sm font-semibold bg-[hsl(24,97%,40%)] text-white hover:bg-[hsl(24,97%,35%)] text-center"
              >
                Contact
              </button>
            ) : (
              <Link
                to="/dashboard"
                className="rounded-md px-3.5 py-2.5 text-sm font-semibold bg-[hsl(24,97%,40%)] text-white hover:bg-[hsl(24,97%,35%)] text-center"
                onClick={() => setIsOpen(false)}
              >
                Dashboard
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;
