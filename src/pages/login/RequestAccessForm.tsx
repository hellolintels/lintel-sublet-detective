
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CardContent, CardFooter, CardDescription } from "@/components/ui/card";
import { Mail } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const RequestAccessForm = () => {
  const [requestEmail, setRequestEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRequestAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!requestEmail) {
      toast.error("Please enter your email address.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log("Access requested with email:", requestEmail);
      
      // First, check if we have the pending-uploads bucket available
      const { data: buckets, error: bucketsError } = await supabase
        .storage
        .listBuckets();
        
      if (bucketsError) {
        console.warn("Could not check storage buckets:", bucketsError.message);
        // Continue anyway, the function might still work
      } else {
        const pendingBucketExists = buckets?.some(b => b.name === 'pending-uploads');
        if (!pendingBucketExists) {
          console.warn("Warning: pending-uploads bucket not found. Storage operations may fail.");
        }
      }
      
      // Send notification to admin about access request
      try {
        const { error, data } = await supabase.functions.invoke("notify-admin", {
          body: {
            full_name: "Access Request",
            email: requestEmail,
            company: "Access Request",
            storagePath: "public/access-request.txt", // Dummy path
          }
        });
        
        if (error) {
          console.error("Error sending notification:", error);
          
          // Check for specific error types
          if (error.message?.includes("Failed to fetch") || 
              error.message?.includes("NetworkError") ||
              error.message?.includes("network")) {
            throw new Error("Network error connecting to our servers. Please check your internet connection and try again.");
          }
          
          throw new Error(error.message || "Unknown error occurred");
        }
        
        console.log("Function response:", data);
        
        // If the function succeeded but email sending failed
        if (data && data.emailSent === false) {
          console.warn("Admin notification recorded but email delivery failed");
          toast.success("Your request has been received, but there might be a delay in processing. We'll get back to you soon.", { 
            duration: 5000 
          });
        } else {
          toast.success("Request received! We'll contact you via email with next steps.");
        }
      } catch (notifyError) {
        console.error("Failed to notify admin:", notifyError);
        // Set a user-friendly error message
        setError("Network error connecting to our servers. Please try again later or contact support@lintels.in");
        throw notifyError; // Re-throw for the outer catch block
      }
      
      // Reset form
      setRequestEmail("");
      setError(null);
    } catch (error: any) {
      console.error("Error requesting access:", error);
      
      // Show user-friendly error message based on error type
      if (error.message?.includes("network") || error.message?.includes("connect")) {
        toast.error("Network error. Please check your internet connection and try again.");
      } else {
        toast.error(error.message || "There was an error processing your request. Please try again later.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleRequestAccess}>
      <CardContent className="space-y-4">
        <CardDescription className="text-gray-400 text-center">
          Enter your email to request access to our property matching service
        </CardDescription>
        <div className="space-y-2">
          <Label htmlFor="requestEmail" className="text-white">Email</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              id="requestEmail"
              type="email"
              value={requestEmail}
              onChange={(e) => setRequestEmail(e.target.value)}
              placeholder="your@email.com"
              className="bg-gray-900 border-gray-800 text-white pl-10"
              required
            />
          </div>
        </div>
        
        {error && (
          <div className="text-red-500 text-sm p-2 bg-red-500/10 border border-red-800 rounded">
            {error}
          </div>
        )}
      </CardContent>
      <CardFooter className="flex flex-col space-y-4">
        <Button 
          type="submit" 
          className="w-full bg-[hsl(24,97%,40%)] hover:bg-[hsl(24,97%,35%)] text-center" 
          disabled={loading}
        >
          {loading ? "Submitting..." : "Request Access"}
        </Button>
      </CardFooter>
    </form>
  );
};

export default RequestAccessForm;
