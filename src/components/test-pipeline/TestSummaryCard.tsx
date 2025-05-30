
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TestSummary } from "@/types/test-pipeline";

interface TestSummaryCardProps {
  testResults: TestSummary;
}

export const TestSummaryCard = ({ testResults }: TestSummaryCardProps) => {
  return (
    <Card className="bg-gray-900 border-gray-800">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          Test Summary
          <Badge variant={testResults.connection_status === "success" ? "default" : "destructive"}>
            {testResults.connection_status}
          </Badge>
          {testResults.coordinate_lookup && (
            <Badge variant="outline" className="text-green-400 border-green-400">
              {testResults.coordinate_lookup}
            </Badge>
          )}
          {testResults.search_precision && (
            <Badge variant="outline" className="text-emerald-400 border-emerald-400">
              {testResults.search_precision}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="text-gray-300">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p><strong>Total Postcodes:</strong> {testResults.total_postcodes}</p>
            <p><strong>Test Time:</strong> {new Date(testResults.test_completed).toLocaleString()}</p>
          </div>
          <div>
            <p><strong>Connection:</strong> {testResults.connection_status}</p>
            {testResults.search_precision && (
              <p><strong>Precision:</strong> {testResults.search_precision}</p>
            )}
            {testResults.error && (
              <p className="text-red-400"><strong>Error:</strong> {testResults.error}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
