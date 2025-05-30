
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle } from "lucide-react";

interface MatchActionsProps {
  matchId: string;
  updatingId: string | null;
  onUpdateMatch: (matchId: string, outcome: string) => void;
}

export const MatchActions = ({ matchId, updatingId, onUpdateMatch }: MatchActionsProps) => {
  return (
    <div className="flex gap-2">
      <Button
        size="sm"
        variant="outline"
        className="bg-green-600 hover:bg-green-700 text-white border-green-600"
        onClick={() => onUpdateMatch(matchId, 'investigate')}
        disabled={updatingId === matchId}
      >
        <CheckCircle size={14} />
      </Button>
      <Button
        size="sm"
        variant="outline"
        className="bg-red-600 hover:bg-red-700 text-white border-red-600"
        onClick={() => onUpdateMatch(matchId, 'no_match')}
        disabled={updatingId === matchId}
      >
        <XCircle size={14} />
      </Button>
    </div>
  );
};
