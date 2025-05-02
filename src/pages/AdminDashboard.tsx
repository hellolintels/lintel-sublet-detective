import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

// Define the contact request type
interface ContactRequest {
  id: string;
  full_name: string;
  company: string;
  email: string;
  created_at: string;
  status: string;
  file_name: string;
}

// Define the report type
interface Report {
  id: string;
  contact_id: string;
  properties_count: number;
  matches_count: number;
  created_at: string;
  status: string;
}

const AdminDashboard = () => {
  const { logout, user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [pendingRequests, setPendingRequests] = useState<ContactRequest[]>([]);
  const [processedReports, setProcessedReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(false);

  // Load all contact requests when the dashboard loads
  useEffect(() => {
    fetchPendingRequests();
    fetchProcessedReports();
  }, []);

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

  const handleApproveRequest = async (contactId: string) => {
    try {
      console.log("Approving request for contact ID:", contactId);
      
      // Update the contact status to "approved"
      const { error: updateError } = await supabase
        .from('contacts')
        .update({ status: 'approved' })
        .eq('id', contactId);
        
      if (updateError) throw updateError;
      
      // Call the process-addresses function with the contact ID
      const { data, error: functionError } = await supabase.functions.invoke('process-addresses', {
        body: {
          contactId: contactId,
          action: 'approve_processing'
        }
      });
      
      if (functionError) {
        console.error("Function error:", functionError);
        throw functionError;
      }
      
      console.log("Function response:", data);
      
      toast({
        title: "Request approved",
        description: "The request has been approved and processing has started",
      });
      
      // Refresh the requests list
      fetchPendingRequests();
      fetchProcessedReports();
    } catch (error) {
      console.error("Error approving request:", error);
      toast({
        title: "Error",
        description: "Failed to approve request: " + (error instanceof Error ? error.message : "Unknown error"),
        variant: "destructive",
      });
    }
  };

  const handleReviewResults = async (reportId: string, contactId: string) => {
    try {
      // Update the report status to "reviewed"
      const { error: updateError } = await supabase
        .from('reports')
        .update({ status: 'reviewed' })
        .eq('id', reportId);
        
      if (updateError) throw updateError;
      
      // Get the contact email
      const { data: contactData, error: contactError } = await supabase
        .from('contacts')
        .select('email')
        .eq('id', contactId)
        .single();
        
      if (contactError) throw contactError;
      
      if (contactData) {
        // Call the process-addresses function to send the email with results
        const { error: functionError } = await supabase.functions.invoke('process-addresses', {
          body: {
            contactId: contactId,
            reportId: reportId,
            action: 'send_results'
          }
        });
        
        if (functionError) throw functionError;
      }
      
      toast({
        title: "Results sent",
        description: "The results have been sent to the client",
      });
      
      // Refresh the reports list
      fetchProcessedReports();
    } catch (error) {
      console.error("Error sending results:", error);
      toast({
        title: "Error",
        description: "Failed to send results",
        variant: "destructive",
      });
    }
  };

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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'new':
        return <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200">New</Badge>;
      case 'pending_approval':
        return <Badge variant="outline" className="bg-purple-100 text-purple-800 border-purple-200">Pending Approval</Badge>;
      case 'approved':
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-200">Approved</Badge>;
      case 'processing':
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-200">Processing</Badge>;
      case 'processed':
        return <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">Processed</Badge>;
      case 'reviewed':
        return <Badge variant="outline" className="bg-purple-100 text-purple-800 border-purple-200">Reviewed</Badge>;
      case 'sent':
        return <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">Sent</Badge>;
      case 'too_many_addresses':
        return <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200">Too Many Addresses</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
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
        
        <div className="grid grid-cols-1 gap-6 mb-8">
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white">Pending Approval Requests</CardTitle>
              <CardDescription className="text-gray-400">
                Review and approve incoming address list requests
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-4 text-gray-400">Loading requests...</div>
              ) : pendingRequests.length === 0 ? (
                <div className="text-center py-4 text-gray-400">No pending requests</div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Company</TableHead>
                        <TableHead>File</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingRequests.map((request) => (
                        <TableRow key={request.id}>
                          <TableCell>{request.full_name}</TableCell>
                          <TableCell>{request.company}</TableCell>
                          <TableCell>{request.file_name}</TableCell>
                          <TableCell>{getStatusBadge(request.status)}</TableCell>
                          <TableCell>{new Date(request.created_at).toLocaleDateString()}</TableCell>
                          <TableCell>
                            {(request.status === 'pending_approval' || request.status === 'new') && (
                              <Button 
                                size="sm"
                                className="bg-[hsl(24,97%,40%)] hover:bg-[hsl(24,97%,35%)]"
                                onClick={() => handleApproveRequest(request.id)}
                              >
                                Approve
                              </Button>
                            )}
                            {request.status === 'too_many_addresses' && (
                              <div className="text-xs text-red-400">Exceeds 20 address limit</div>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
          
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white">Processed Reports</CardTitle>
              <CardDescription className="text-gray-400">
                Review reports and send them to clients
              </CardDescription>
            </CardHeader>
            <CardContent>
              {processedReports.length === 0 ? (
                <div className="text-center py-4 text-gray-400">No processed reports yet</div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Properties</TableHead>
                        <TableHead>Matches</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {processedReports.map((report) => (
                        <TableRow key={report.id}>
                          <TableCell>{report.properties_count}</TableCell>
                          <TableCell>{report.matches_count}</TableCell>
                          <TableCell>{getStatusBadge(report.status)}</TableCell>
                          <TableCell>{new Date(report.created_at).toLocaleDateString()}</TableCell>
                          <TableCell>
                            {report.status === 'processed' && (
                              <Button 
                                size="sm"
                                className="bg-[hsl(24,97%,40%)] hover:bg-[hsl(24,97%,35%)]"
                                onClick={() => handleReviewResults(report.id, report.contact_id)}
                              >
                                Review & Send
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
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
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
