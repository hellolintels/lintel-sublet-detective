
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MatchRow } from "./MatchRow";

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

interface MatchTableProps {
  matches: Match[];
  updatingId: string | null;
  onUpdateMatch: (matchId: string, outcome: string) => void;
}

export const MatchTable = ({ matches, updatingId, onUpdateMatch }: MatchTableProps) => {
  return (
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
            <MatchRow
              key={match.id}
              match={match}
              updatingId={updatingId}
              onUpdateMatch={onUpdateMatch}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
