
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import Features from "@/components/Features";
import HowItWorks from "@/components/HowItWorks";
import Contact from "@/components/Contact";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-black text-white overflow-x-hidden">
      <Navbar />
      <div className="flex flex-col gap-12 sm:gap-16 md:gap-24">
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
