
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ExternalLink, CheckCircle, XCircle } from "lucide-react";

interface Match {
  id: string;
  contact_id: string;
  postcode: string;
  address: string | null;
  platform: string;
  matched_listing_url: string;
  listing_title: string | null;
  outcome: string;
  created_at: string;
}

interface MatchReviewProps {
  contactId: string;
  contactName: string;
  onMatchesUpdated: () => void;
}

export const MatchReview = ({ contactId, contactName, onMatchesUpdated }: MatchReviewProps) => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    fetchMatches();
  }, [contactId]);

  const fetchMatches = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('match_results')
        .select('*')
        .eq('contact_id', contactId)
        .order('postcode', { ascending: true });
        
      if (error) throw error;
      
      setMatches(data || []);
    } catch (error) {
      console.error("Error fetching matches:", error);
      toast({
        title: "Error",
        description: "Failed to fetch matches",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateMatchOutcome = async (matchId: string, outcome: string) => {
    try {
      setUpdatingId(matchId);
      
      const { error } = await supabase
        .from('match_results')
        .update({ 
          outcome,
          reviewed_at: new Date().toISOString(),
          reviewed_by: (await supabase.auth.getUser()).data.user?.id
        })
        .eq('id', matchId);
        
      if (error) throw error;
      
      await fetchMatches();
      onMatchesUpdated();
      
      toast({
        title: "Match updated",
        description: `Match ${outcome === 'investigate' ? 'marked for investigation' : 'marked as no match'}`,
      });
    } catch (error) {
      console.error("Error updating match:", error);
      toast({
        title: "Error",
        description: "Failed to update match",
        variant: "destructive",
      });
    } finally {
      setUpdatingId(null);
    }
  };

  const getOutcomeBadge = (outcome: string) => {
    switch (outcome) {
      case 'investigate':
        return <Badge className="bg-green-600">Investigate</Badge>;
      case 'no_match':
        return <Badge variant="destructive">No Match</Badge>;
      default:
        return <Badge variant="outline">Pending</Badge>;
    }
  };

  const investigateCount = matches.filter(m => m.outcome === 'investigate').length;
  const totalMatches = matches.filter(m => m.matched_listing_url).length;

  return (
    <Card className="bg-gray-900 border-gray-800">
      <CardHeader>
        <CardTitle className="text-white">Match Review - {contactName}</CardTitle>
        <CardDescription className="text-gray-400">
          Review individual matches before generating the final report ({investigateCount} marked for investigation out of {totalMatches} matches)
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-4 text-gray-400">Loading matches...</div>
        ) : matches.length === 0 ? (
          <div className="text-center py-4 text-gray-400">No matches found</div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Postcode</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Platform</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Listing</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {matches.map((match) => (
                  <TableRow key={match.id}>
                    <TableCell className="font-mono">{match.postcode}</TableCell>
                    <TableCell>{match.address || '-'}</TableCell>
                    <TableCell className="capitalize">{match.platform}</TableCell>
                    <TableCell>{getOutcomeBadge(match.outcome)}</TableCell>
                    <TableCell>
                      {match.matched_listing_url ? (
                        <a 
                          href={match.matched_listing_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:text-blue-300 flex items-center gap-1"
                        >
                          <ExternalLink size={14} />
                          View
                        </a>
                      ) : (
                        <span className="text-gray-500">No URL</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {match.matched_listing_url && match.outcome === 'pending' && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="bg-green-600 hover:bg-green-700 text-white border-green-600"
                            onClick={() => updateMatchOutcome(match.id, 'investigate')}
                            disabled={updatingId === match.id}
                          >
                            <CheckCircle size={14} />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="bg-red-600 hover:bg-red-700 text-white border-red-600"
                            onClick={() => updateMatchOutcome(match.id, 'no_match')}
                            disabled={updatingId === match.id}
                          >
                            <XCircle size={14} />
                          </Button>
                        </div>
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
