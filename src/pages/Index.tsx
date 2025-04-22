
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import Features from "@/components/Features";
import HowItWorks from "@/components/HowItWorks";
import SampleOffer from "@/components/SampleOffer";
import Contact from "@/components/Contact";
// Removed LimePalettePreview

const Index = () => {
  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />
      {/* Removed <LimePalettePreview /> */}
      <Hero />
      <Features />
      <HowItWorks />
      {/* Removed the SampleOffer section to integrate as a callout in Contact */}
      <Contact />
    </div>
  );
};

export default Index;
