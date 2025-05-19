
import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import Logo from "@/components/Logo";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import LoginTabs from "./login/LoginTabs";

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useAuth();

  // If user is already authenticated, redirect to dashboard
  useEffect(() => {
    if (isAuthenticated) {
      const from = location.state?.from?.pathname || "/dashboard";
      console.log("User is authenticated, redirecting to:", from);
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, location]);

  const handleGoBack = () => {
    navigate("/");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black p-4">
      <Card className="w-full max-w-md bg-black border border-gray-800">
        <CardHeader className="space-y-1 flex flex-col items-center">
          <Logo />
          <CardTitle className="text-2xl text-white mt-4">
            lintels.in Access
          </CardTitle>
        </CardHeader>
        
        <LoginTabs />
        
        <CardFooter className="pt-0">
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
      </Card>
    </div>
  );
};

export default Login;
