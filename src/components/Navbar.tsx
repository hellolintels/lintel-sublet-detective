import React, { useState } from "react";
import { Link, NavLink as RouterNavLink } from "react-router-dom";
import { useMediaQuery } from 'react-responsive';
import { styled } from 'styled-components';
import Logo from "@/components/Logo";
import { useAuth } from "@/contexts/AuthContext";

const NavLink = styled(RouterNavLink)`
  &.active {
    font-weight: bold;
    color: hsl(24,97%,40%);
  }
  
  &:hover {
    color: hsl(24,97%,40%);
    transition: color 0.3s ease;
  }
`;

const MobileNavLink = styled(Link)`
  display: block;
  padding: 10px 15px;
  text-decoration: none;
  color: white;
  border-bottom: 1px solid #444;

  &:last-child {
    border-bottom: none;
  }

  &:hover {
    background-color: #111;
  }
`;

const useMobile = () => {
  return useMediaQuery({ maxWidth: 768 });
};

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const isMobile = useMobile();
  const { isAuthenticated, user } = useAuth();
  const isAdmin = user?.email === "jamie@lintels.in";

  return (
    <header className="fixed top-0 left-0 right-0 z-50 px-4 bg-black border-b border-gray-800">
      <div className="container mx-auto">
        <div className="flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center space-x-2">
            <Logo />
          </Link>
          
          <nav className="hidden md:flex items-center space-x-6">
            <NavLink to="/" exact>Home</NavLink>
            {isAuthenticated && (
              <>
                <NavLink to="/dashboard">Dashboard</NavLink>
                {isAdmin && (
                  <NavLink to="/admin">Admin</NavLink>
                )}
              </>
            )}
            {!isAuthenticated ? (
              <Link 
                to="/login"
                className="rounded-md px-3.5 py-2.5 text-sm font-semibold bg-[hsl(24,97%,40%)] text-white hover:bg-[hsl(24,97%,35%)] transition-colors"
              >
                Sign In
              </Link>
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
            <MobileNavLink to="/" onClick={() => setIsOpen(false)}>Home</MobileNavLink>
            {isAuthenticated && (
              <>
                <MobileNavLink to="/dashboard" onClick={() => setIsOpen(false)}>Dashboard</MobileNavLink>
                {isAdmin && (
                  <MobileNavLink to="/admin" onClick={() => setIsOpen(false)}>Admin</MobileNavLink>
                )}
              </>
            )}
            {!isAuthenticated ? (
              <Link 
                to="/login"
                className="rounded-md px-3.5 py-2.5 text-sm font-semibold bg-[hsl(24,97%,40%)] text-white hover:bg-[hsl(24,97%,35%)] text-center"
                onClick={() => setIsOpen(false)}
              >
                Sign In
              </Link>
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
