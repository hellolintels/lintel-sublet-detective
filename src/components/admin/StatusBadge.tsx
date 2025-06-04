
import { Badge } from "@/components/ui/badge";

interface StatusBadgeProps {
  status: string;
}

export const StatusBadge = ({ status }: StatusBadgeProps) => {
  switch (status) {
    case 'new':
      return <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200">New</Badge>;
    case 'pending_approval':
      return <Badge variant="outline" className="bg-purple-100 text-purple-800 border-purple-200">Pending Approval</Badge>;
    case 'approved':
      return <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-200">Approved</Badge>;
    case 'processing':
    case 'scraping':
    case 'railway_processing':
      return <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-200">Processing via Railway</Badge>;
    case 'processed':
      return <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">Processed</Badge>;
    case 'reviewed':
      return <Badge variant="outline" className="bg-purple-100 text-purple-800 border-purple-200">Reviewed</Badge>;
    case 'sent':
    case 'report_sent':
      return <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">Report Sent</Badge>;
    case 'too_many_addresses':
      return <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200">Too Many Addresses</Badge>;
    case 'error':
      return <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200">Error</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};
