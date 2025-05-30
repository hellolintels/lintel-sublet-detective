
import { Badge } from "@/components/ui/badge";

interface MatchStatusBadgeProps {
  outcome: string;
}

export const MatchStatusBadge = ({ outcome }: MatchStatusBadgeProps) => {
  switch (outcome) {
    case 'investigate':
      return <Badge className="bg-green-600">Investigate</Badge>;
    case 'no_match':
      return <Badge variant="destructive">No Match</Badge>;
    default:
      return <Badge variant="outline">Pending</Badge>;
  }
};
