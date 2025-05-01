
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Navbar from "@/components/Navbar";

const Dashboard = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if the user is authenticated
    const token = localStorage.getItem("auth_token");
    if (!token) {
      navigate("/login");
      return;
    }
    
    // This is where you would validate the token with Supabase after integration
    // For now, we'll just simulate a loading state
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [navigate]);

  const handleLogout = () => {
    // Remove the auth token and redirect to login
    localStorage.removeItem("auth_token");
    navigate("/login");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[hsl(24,97%,40%)]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />
      <div className="container mx-auto pt-20 px-4">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <Button 
            variant="destructive" 
            onClick={handleLogout}
          >
            Logout
          </Button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white">Data Upload</CardTitle>
              <CardDescription className="text-gray-400">Upload property data for scanning</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-400">
                After connecting to Supabase, this will allow for CSV uploads of property data.
              </p>
              <Button className="mt-4 w-full bg-[hsl(24,97%,40%)] hover:bg-[hsl(24,97%,35%)]">
                Upload Data
              </Button>
            </CardContent>
          </Card>
          
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white">Reports</CardTitle>
              <CardDescription className="text-gray-400">View and manage scan reports</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-400">
                After connecting to Supabase, this will show your scan reports and results.
              </p>
              <Button className="mt-4 w-full bg-[hsl(24,97%,40%)] hover:bg-[hsl(24,97%,35%)]">
                View Reports
              </Button>
            </CardContent>
          </Card>
          
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white">Analytics</CardTitle>
              <CardDescription className="text-gray-400">Dashboard statistics and metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-400">
                After connecting to Supabase, this will display analytics and metrics.
              </p>
              <Button className="mt-4 w-full bg-[hsl(24,97%,40%)] hover:bg-[hsl(24,97%,35%)]">
                View Analytics
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
