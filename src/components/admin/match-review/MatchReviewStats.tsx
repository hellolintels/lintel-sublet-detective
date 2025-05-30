
interface MatchReviewStatsProps {
  investigateCount: number;
  totalMatches: number;
  contactName: string;
}

export const MatchReviewStats = ({ investigateCount, totalMatches, contactName }: MatchReviewStatsProps) => {
  return (
    <div className="text-gray-400">
      Review individual matches before generating the final report ({investigateCount} marked for investigation out of {totalMatches} matches)
    </div>
  );
};
