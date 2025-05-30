
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminSetup } from "@/hooks/useAdminSetup";
import Navbar from "@/components/Navbar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";
import { ContactRequest, Report } from "@/types/admin";
import { DashboardHeader } from "@/components/admin/DashboardHeader";
import { PendingRequests } from "@/components/admin/PendingRequests";
import { ProcessedReports } from "@/components/admin/ProcessedReports";
import { FileUploader } from "@/components/admin/FileUploader";
import BrightDataTester from "@/pages/dashboard/BrightDataTester";

const AdminDashboard = () => {
  const { logout } = useAuth();
  const { setupAttempted } = useAdminSetup();
  const [pendingRequests, setPendingRequests] = useState<ContactRequest[]>([]);
  const [processedReports, setProcessedReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(false);

  // Load all contact requests when the dashboard loads
  useEffect(() => {
    if (setupAttempted) {
      fetchPendingRequests();
      fetchProcessedReports();
    }
  }, [setupAttempted]);

  const fetchPendingRequests = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      
      setPendingRequests(data || []);
    } catch (error) {
      console.error("Error fetching contact requests:", error);
      toast({
        title: "Error",
        description: "Failed to fetch contact requests",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  
  const fetchProcessedReports = async () => {
    try {
      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      
      setProcessedReports(data || []);
    } catch (error) {
      console.error("Error fetching processed reports:", error);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Error during logout:", error);
    }
  };

  const refreshData = () => {
    fetchPendingRequests();
    fetchProcessedReports();
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />
      <div className="container mx-auto pt-20 px-4">
        <DashboardHeader onLogout={handleLogout} />
        
        <div className="grid grid-cols-1 gap-6 mb-8">
          <PendingRequests 
            pendingRequests={pendingRequests}
            loading={loading}
            onRefresh={refreshData}
          />
          
          <ProcessedReports 
            processedReports={processedReports}
            onRefresh={refreshData}
          />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FileUploader />
          <BrightDataTester />
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
