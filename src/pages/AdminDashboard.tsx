
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const AdminDashboard = () => {
  const { logout, user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Error during logout:", error);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast({
        title: "No file selected",
        description: "Please select a file to upload",
        variant: "destructive",
      });
      return;
    }

    try {
      setUploading(true);
      
      // Upload file to storage
      const filename = `${Date.now()}-${file.name}`;
      const { data, error } = await supabase.storage
        .from('address-lists')
        .upload(filename, file);
      
      if (error) throw error;
      
      toast({
        title: "Upload successful",
        description: "File has been uploaded and will be processed",
      });
      
      setFile(null);
    } catch (error) {
      console.error("Error uploading file:", error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />
      <div className="container mx-auto pt-20 px-4">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold">Admin Dashboard</h1>
            {user?.email && (
              <p className="text-gray-400 mt-1">Logged in as: {user.email}</p>
            )}
          </div>
          <Button 
            variant="destructive" 
            onClick={handleLogout}
          >
            Logout
          </Button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white">Upload Address List</CardTitle>
              <CardDescription className="text-gray-400">Upload address lists for checking</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="file" className="text-white">Select CSV File</Label>
                  <Input 
                    id="file" 
                    type="file" 
                    accept=".csv" 
                    onChange={handleFileChange}
                    className="bg-gray-900 border-gray-800 text-white"
                  />
                </div>
                <Button 
                  className="w-full bg-[hsl(24,97%,40%)] hover:bg-[hsl(24,97%,35%)]"
                  onClick={handleUpload}
                  disabled={uploading || !file}
                >
                  {uploading ? "Uploading..." : "Upload Address List"}
                </Button>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white">Download Reports</CardTitle>
              <CardDescription className="text-gray-400">Access processed address lists</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-400 mb-4">
                Download processed reports before sending them to clients.
              </p>
              <Button className="w-full bg-[hsl(24,97%,40%)] hover:bg-[hsl(24,97%,35%)]">
                View Available Reports
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
