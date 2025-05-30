
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { MatchTable } from "./match-review/MatchTable";
import { MatchReviewStats } from "./match-review/MatchReviewStats";

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

  const investigateCount = matches.filter(m => m.outcome === 'investigate').length;
  const totalMatches = matches.filter(m => m.matched_listing_url).length;

  return (
    <Card className="bg-gray-900 border-gray-800">
      <CardHeader>
        <CardTitle className="text-white">Match Review - {contactName}</CardTitle>
        <CardDescription>
          <MatchReviewStats 
            investigateCount={investigateCount}
            totalMatches={totalMatches}
            contactName={contactName}
          />
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-4 text-gray-400">Loading matches...</div>
        ) : matches.length === 0 ? (
          <div className="text-center py-4 text-gray-400">No matches found</div>
        ) : (
          <MatchTable
            matches={matches}
            updatingId={updatingId}
            onUpdateMatch={updateMatchOutcome}
          />
        )}
      </CardContent>
    </Card>
  );
};
