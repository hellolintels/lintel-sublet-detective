
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import Features from "@/components/Features";
import HowItWorks from "@/components/HowItWorks";
import Contact from "@/components/Contact";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />
      <div className="space-y-12 sm:space-y-0">
        <Hero />
        <Features />
        <HowItWorks />
        <Contact />
        <Footer />
      </div>
    </div>
  );
};

export default Index;
