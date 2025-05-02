
import Hero from "@/components/Hero";
import Features from "@/components/Features";
import HowItWorks from "@/components/HowItWorks";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import Onboarding from "@/components/Onboarding";

const Index = () => {
  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />
      
      <div className="container mx-auto px-4 pt-24">
        <Hero />
        <HowItWorks />
        <Onboarding />
        <Features />
        <Footer />
      </div>
    </div>
  );
};

export default Index;
