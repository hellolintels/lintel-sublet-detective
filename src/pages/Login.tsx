
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import Logo from "@/components/Logo";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const Login = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleRequestAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast.error("Please enter your email address.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log("Access requested with email:", email);
      
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
            email: email,
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
      } catch (notifyError) {
        console.error("Failed to notify admin:", notifyError);
        // Set a user-friendly error message
        setError("Network error connecting to our servers. Please try again later or contact support@lintels.in");
        throw notifyError; // Re-throw for the outer catch block
      }
      
      toast.success("Request received! We'll contact you via email with next steps.");
      
      // Reset form
      setEmail("");
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

  const handleGoBack = () => {
    navigate("/");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black p-4">
      <Card className="w-full max-w-md bg-black border border-gray-800">
        <CardHeader className="space-y-1 flex flex-col items-center">
          <Logo />
          <CardTitle className="text-2xl text-white mt-4">
            Request Access to lintels.in
          </CardTitle>
          <CardDescription className="text-gray-400 text-center">
            Enter your email to request access to our property matching service
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleRequestAccess}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-white">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="bg-gray-900 border-gray-800 text-white"
                required
              />
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
            <Button 
              type="button" 
              variant="ghost" 
              className="text-gray-400 hover:text-white w-full flex items-center justify-center"
              onClick={handleGoBack}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default Login;
