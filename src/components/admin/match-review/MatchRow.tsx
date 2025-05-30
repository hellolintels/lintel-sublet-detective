
import { TableCell, TableRow } from "@/components/ui/table";
import { ExternalLink } from "lucide-react";
import { MatchActions } from "./MatchActions";
import { MatchStatusBadge } from "./MatchStatusBadge";

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

interface MatchRowProps {
  match: Match;
  updatingId: string | null;
  onUpdateMatch: (matchId: string, outcome: string) => void;
}

export const MatchRow = ({ match, updatingId, onUpdateMatch }: MatchRowProps) => {
  return (
    <TableRow>
      <TableCell className="font-mono">{match.postcode}</TableCell>
      <TableCell>{match.address || '-'}</TableCell>
      <TableCell className="capitalize">{match.platform}</TableCell>
      <TableCell>
        <MatchStatusBadge outcome={match.outcome} />
      </TableCell>
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
          <MatchActions
            matchId={match.id}
            updatingId={updatingId}
            onUpdateMatch={onUpdateMatch}
          />
        )}
      </TableCell>
    </TableRow>
  );
};
