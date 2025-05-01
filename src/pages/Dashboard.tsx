
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/contexts/AuthContext";

const Dashboard = () => {
  const { logout, user } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Error during logout:", error);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />
      <div className="container mx-auto pt-20 px-4">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold">Dashboard</h1>
            {user?.email && (
              <p className="text-gray-400 mt-1">Welcome, {user.email}</p>
            )}
          </div>
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
                Upload CSV files containing your property portfolio data for analysis.
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
                Access detailed reports and analytics about your property portfolio.
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
                Visualize key metrics and insights about your rental portfolio.
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
