/**
 * Supabase Edge Function: process-addresses
 * 
 * This function handles incoming HTTP requests and routes them to the appropriate
 * handler based on the 'action' and 'contact_id' query parameters.
 * 
 * Supported actions:
 * - approve_processing
 * - reject_processing
 * - initial_process
 * - send_results
 * 
 * The function ensures proper CORS handling, error handling, and response formatting.
 */

import Hero from "@/components/Hero";
import Features from "@/components/Features";
import HowItWorks from "@/components/HowItWorks";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import Onboarding from "@/components/Onboarding";
import Contact from "@/components/Contact";

const Index = () => {
  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />
      
      <div className="container mx-auto px-4 pt-24">
        <Hero />
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
