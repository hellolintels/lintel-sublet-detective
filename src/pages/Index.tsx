
import Hero from "@/components/Hero";
import Features from "@/components/Features";
import HowItWorks from "@/components/HowItWorks";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import Onboarding from "@/components/Onboarding";
import Contact from "@/components/Contact";
import SampleOffer from "@/components/SampleOffer";

const Index = () => {
  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />
      
      <div className="container mx-auto px-4 pt-24">
        <Hero />
        <SampleOffer />
        <HowItWorks />
        <Onboarding />
        <Features />
        <Contact />
        <Footer />
      </div>
    </div>
  );
};

export default Index;
