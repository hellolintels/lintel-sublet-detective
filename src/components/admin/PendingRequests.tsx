
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ContactRequest } from "@/types/admin";
import { StatusBadge } from "./StatusBadge";

interface PendingRequestsProps {
  pendingRequests: ContactRequest[];
  loading: boolean;
  onRefresh: () => void;
}

export const PendingRequests = ({ pendingRequests, loading, onRefresh }: PendingRequestsProps) => {
  const [processingId, setProcessingId] = useState<string | null>(null);

  const handleApproveRequest = async (contactId: string) => {
    try {
      setProcessingId(contactId);
      console.log("Approving request for contact ID:", contactId);
      
      // Update the contact status to "approved"
      const { error: updateError } = await supabase
        .from('contacts')
        .update({ status: 'approved' })
        .eq('id', contactId);
        
      if (updateError) throw updateError;
      
      // Call the railway-trigger function to start Railway processing
      const { data, error: functionError } = await supabase.functions.invoke('railway-trigger', {
        body: {
          contactId: contactId
        }
      });
      
      if (functionError) {
        console.error("Railway trigger error:", functionError);
        throw functionError;
      }
      
      console.log("Railway processing started:", data);
      
      toast({
        title: "Request approved",
        description: "The request has been approved and Railway processing has started",
      });
      
      // Refresh the requests list
      onRefresh();
    } catch (error) {
      console.error("Error approving request:", error);
      toast({
        title: "Error",
        description: "Failed to approve request: " + (error instanceof Error ? error.message : "Unknown error"),
        variant: "destructive",
      });
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <Card className="bg-gray-900 border-gray-800">
      <CardHeader>
        <CardTitle className="text-white">Pending Approval Requests</CardTitle>
        <CardDescription className="text-gray-400">
          Review and approve incoming address list requests (processed via Railway API)
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
                    <TableCell><StatusBadge status={request.status} /></TableCell>
                    <TableCell>{new Date(request.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      {(request.status === 'pending_approval' || request.status === 'new') && (
                        <Button 
                          size="sm"
                          className="bg-[hsl(24,97%,40%)] hover:bg-[hsl(24,97%,35%)]"
                          onClick={() => handleApproveRequest(request.id)}
                          disabled={processingId === request.id}
                        >
                          {processingId === request.id ? "Starting Railway..." : "Approve & Process"}
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
  );
};
