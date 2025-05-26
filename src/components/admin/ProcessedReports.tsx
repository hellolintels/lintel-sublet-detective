
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Report } from "@/types/admin";
import { StatusBadge } from "./StatusBadge";
import { MatchReview } from "./MatchReview";
import { Eye, Send } from "lucide-react";

interface ProcessedReportsProps {
  processedReports: Report[];
  onRefresh: () => void;
}

export const ProcessedReports = ({ processedReports, onRefresh }: ProcessedReportsProps) => {
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [reviewingContact, setReviewingContact] = useState<{id: string, name: string} | null>(null);

  const handleReviewMatches = (reportId: string, contactId: string, contactName: string) => {
    setReviewingContact({ id: contactId, name: contactName });
  };

  const handleSendResults = async (reportId: string, contactId: string) => {
    try {
      setSendingId(reportId);
      
      // Call the process-addresses function to send the email with results
      const { error: functionError } = await supabase.functions.invoke('process-addresses', {
        body: {
          contactId: contactId,
          reportId: reportId,
          action: 'send_results'
        }
      });
      
      if (functionError) throw functionError;
      
      // Update the report status to "sent"
      const { error: updateError } = await supabase
        .from('reports')
        .update({ status: 'sent' })
        .eq('id', reportId);
        
      if (updateError) throw updateError;
      
      toast({
        title: "Results sent",
        description: "The results have been sent to the client",
      });
      
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

  // Group reports by contact to show matches that need review
  const reportsWithMatches = processedReports.filter(report => 
    report.status === 'processed' || report.status === 'matches_found'
  );

  return (
    <>
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white">Processed Reports & Match Review</CardTitle>
          <CardDescription className="text-gray-400">
            Review individual matches and send reports to clients
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
                        <div className="flex gap-2">
                          {(report.status === 'processed' || report.status === 'matches_found') && (
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button 
                                  size="sm"
                                  variant="outline"
                                  className="text-blue-400 border-blue-400 hover:bg-blue-400 hover:text-black"
                                >
                                  <Eye size={14} className="mr-1" />
                                  Review
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-6xl max-h-[80vh] overflow-y-auto bg-gray-900 border-gray-800">
                                <DialogHeader>
                                  <DialogTitle className="text-white">Match Review</DialogTitle>
                                </DialogHeader>
                                <MatchReview 
                                  contactId={report.contact_id}
                                  contactName={`Contact ${report.contact_id}`}
                                  onMatchesUpdated={onRefresh}
                                />
                              </DialogContent>
                            </Dialog>
                          )}
                          
                          {report.status === 'processed' && (
                            <Button 
                              size="sm"
                              className="bg-[hsl(24,97%,40%)] hover:bg-[hsl(24,97%,35%)] text-white"
                              onClick={() => handleSendResults(report.id, report.contact_id)}
                              disabled={sendingId === report.id}
                            >
                              <Send size={14} className="mr-1" />
                              {sendingId === report.id ? "Sending..." : "Send Report"}
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
};
