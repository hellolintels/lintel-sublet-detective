
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TestSummary } from "@/types/test-pipeline";

interface TestSummaryCardProps {
  testResults: TestSummary;
}

export const TestSummaryCard = ({ testResults }: TestSummaryCardProps) => {
  const getOverallStatus = () => {
    if (testResults.overall_success) return "success";
    if (testResults.api_status === "success") return "mixed";
    return "failed";
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "success": return "default";
      case "mixed": return "secondary";
      case "failed": return "destructive";
      default: return "outline";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "success": return "Verification Complete";
      case "mixed": return "Mixed Results";
      case "failed": return "Verification Issues";
      default: return "Unknown";
    }
  };

  return (
    <Card className="bg-gray-900 border-gray-800">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          Verification Summary
          <Badge variant={getStatusColor(getOverallStatus())}>
            {getStatusText(getOverallStatus())}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="text-gray-300">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p><strong>Postcodes Tested:</strong> {testResults.total_postcodes}</p>
            <p><strong>Verification Time:</strong> {new Date(testResults.test_completed).toLocaleString()}</p>
          </div>
          <div>
            {testResults.performance && (
              <div className="space-y-1">
                <p><strong>Properties Found:</strong> {testResults.performance.total_matches_found || 0}</p>
                <p><strong>Success Rate:</strong> {testResults.api_diagnostics?.success_percentage || '0%'}</p>
              </div>
            )}
            {testResults.error && (
              <p className="text-red-400"><strong>Error:</strong> {testResults.error}</p>
            )}
          </div>
        </div>
        
        {testResults.recommendations && testResults.recommendations.length > 0 && (
          <div className="mt-4 p-3 bg-gray-800 rounded">
            <p className="text-sm font-medium mb-2">Verification Notes:</p>
            <ul className="text-sm space-y-1">
              {testResults.recommendations.slice(0, 3).map((rec, index) => (
                <li key={index} className="text-gray-400">• {rec}</li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
