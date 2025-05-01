
import { Link } from "react-router-dom";
import Hero from "@/components/Hero";
import Features from "@/components/Features";
import HowItWorks from "@/components/HowItWorks";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";

const Index = () => {
  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />
      
      <div className="container mx-auto px-4 pt-24">
        <div className="flex justify-end mb-6">
          <Link to="/login">
            <Button className="bg-[hsl(24,97%,40%)] hover:bg-[hsl(24,97%,35%)]">
              Login / Sign Up
            </Button>
          </Link>
        </div>
        
        <Hero />
        <HowItWorks />
        <Features />
        <Footer />
      </div>
    </div>
  );
};

export default Index;
