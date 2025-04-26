
import Navbar from "@/components/Navbar";
import { ContactForm } from "@/components/ContactForm";
import Features from "@/components/Features";
import HowItWorks from "@/components/HowItWorks";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />
      <div className="pt-24 pb-12 flex justify-center">
        <ContactForm />
      </div>
      <Features />
      <HowItWorks />
      <Footer />
    </div>
  );
};

export default Index;
