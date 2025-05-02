
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Report } from "@/types/admin";
import { StatusBadge } from "./StatusBadge";

interface ProcessedReportsProps {
  processedReports: Report[];
  onRefresh: () => void;
}

export const ProcessedReports = ({ processedReports, onRefresh }: ProcessedReportsProps) => {
  const [sendingId, setSendingId] = useState<string | null>(null);

  const handleReviewResults = async (reportId: string, contactId: string) => {
    try {
      setSendingId(reportId);
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
      onRefresh();
    } catch (error) {
      console.error("Error sending results:", error);
      toast({
        title: "Error",
        description: "Failed to send results",
        variant: "destructive",
      });
    } finally {
      setSendingId(null);
    }
  };

  return (
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
                    <TableCell><StatusBadge status={report.status} /></TableCell>
                    <TableCell>{new Date(report.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      {report.status === 'processed' && (
                        <Button 
                          size="sm"
                          className="bg-[hsl(24,97%,40%)] hover:bg-[hsl(24,97%,35%)]"
                          onClick={() => handleReviewResults(report.id, report.contact_id)}
                          disabled={sendingId === report.id}
                        >
                          {sendingId === report.id ? "Sending..." : "Review & Send"}
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
  );
};
