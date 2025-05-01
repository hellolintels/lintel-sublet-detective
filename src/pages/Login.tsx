
import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import Logo from "@/components/Logo";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/components/ui/use-toast";
import { ArrowLeft } from "lucide-react";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated, user } = useAuth();
  
  // Get redirect path from location state or default to dashboard
  const from = (location.state as any)?.from?.pathname || "/dashboard";
  
  // Redirect already authenticated users
  useEffect(() => {
    console.log("Auth state:", { isAuthenticated, user });
    
    if (isAuthenticated) {
      // Redirect admin users to the admin dashboard
      if (user?.email === "jamie@lintels.in") {
        console.log("Redirecting admin to /admin");
        navigate("/admin", { replace: true });
      } else {
        console.log("Redirecting user to:", from);
        navigate(from, { replace: true });
      }
    }
  }, [isAuthenticated, user, navigate, from]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    
    if (!email || !password) {
      toast({
        title: "Error",
        description: "Please enter your email and password.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      console.log("Attempting login with:", email);
      
      // Use our login method from auth context
      await login(email, password);
      
      // If login is successful, the useEffect will handle redirection
    } catch (error) {
      console.error("Login error:", error);
      
      let errorMessage = "Invalid credentials. Please check your email and password.";
      
      // Special handling for known errors
      if (error instanceof Error) {
        errorMessage = error.message;
        
        // More user-friendly message for email not confirmed
        if (error.message === "Email not confirmed") {
          errorMessage = "Your email has not been confirmed yet. Please check your inbox for a confirmation link or contact support.";
        }
      }
      
      setLoginError(errorMessage);
      
      toast({
        title: "Login failed",
        description: errorMessage,
        variant: "destructive",
      });
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
            Sign in to lintels.in
          </CardTitle>
          <CardDescription className="text-gray-400">
            Enter your credentials to access the admin portal
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleAuth}>
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
            <div className="space-y-2">
              <Label htmlFor="password" className="text-white">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="bg-gray-900 border-gray-800 text-white"
                required
              />
            </div>
            {loginError && (
              <div className="text-sm text-red-500 pt-2">
                {loginError}
              </div>
            )}
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button 
              type="submit" 
              className="w-full bg-[hsl(24,97%,40%)] hover:bg-[hsl(24,97%,35%)]" 
              disabled={loading}
            >
              {loading ? "Signing in..." : "Sign in"}
            </Button>
            <Button 
              type="button" 
              variant="ghost" 
              className="text-gray-400 hover:text-white flex items-center"
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
