
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TestSummary } from "@/types/test-pipeline";
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  Target, 
  MapPin, 
  Activity,
  CreditCard,
  TrendingUp
} from "lucide-react";

interface TestSummaryCardProps {
  testResults: TestSummary;
}

export const TestSummaryCard = ({ testResults }: TestSummaryCardProps) => {
  const { summary } = testResults;
  
  if (!summary) {
    return (
      <Card className="bg-gray-900 border-gray-800">
        <CardContent className="p-6">
          <div className="text-center text-gray-400">
            Summary data not available
          </div>
        </CardContent>
      </Card>
    );
  }

  const successRate = parseFloat(summary.success_rate.replace('%', ''));
  const isHighPerformance = successRate >= 80;
  const isGoodPerformance = successRate >= 60;

  return (
    <div className="space-y-6">
      {/* Main Summary Card */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-green-400" />
              <span>Enhanced Property Search Verification Summary</span>
            </div>
            <Badge variant={isHighPerformance ? "default" : isGoodPerformance ? "secondary" : "destructive"}>
              {summary.success_rate} Success Rate
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Results Breakdown */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-400" />
                <span className="text-sm text-gray-300">Properties Found</span>
              </div>
              <div className="text-2xl font-bold text-green-400">
                {summary.result_breakdown.properties_found}
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-blue-400" />
                <span className="text-sm text-gray-300">No Properties</span>
              </div>
              <div className="text-2xl font-bold text-blue-400">
                {summary.result_breakdown.no_properties}
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-red-400" />
                <span className="text-sm text-gray-300">Errors</span>
              </div>
              <div className="text-2xl font-bold text-red-400">
                {summary.result_breakdown.errors}
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-purple-400" />
                <span className="text-sm text-gray-300">Total Tests</span>
              </div>
              <div className="text-2xl font-bold text-purple-400">
                {summary.total_platform_tests}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Accuracy Metrics */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <MapPin className="h-5 w-5 text-blue-400" />
            Search Accuracy & Precision
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 rounded border border-green-700 bg-green-900/20">
              <div className="text-2xl font-bold text-green-400">
                {summary.accuracy_metrics.coordinate_based_searches}
              </div>
              <div className="text-sm text-green-300">Coordinate-Based</div>
              <div className="text-xs text-gray-400 mt-1">Highest Precision</div>
            </div>
            
            <div className="text-center p-4 rounded border border-blue-700 bg-blue-900/20">
              <div className="text-2xl font-bold text-blue-400">
                {summary.accuracy_metrics.address_based_searches}
              </div>
              <div className="text-sm text-blue-300">Address-Based</div>
              <div className="text-xs text-gray-400 mt-1">High Precision</div>
            </div>
            
            <div className="text-center p-4 rounded border border-yellow-700 bg-yellow-900/20">
              <div className="text-2xl font-bold text-yellow-400">
                {summary.accuracy_metrics.postcode_only_searches}
              </div>
              <div className="text-sm text-yellow-300">Postcode Only</div>
              <div className="text-xs text-gray-400 mt-1">Standard Precision</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Platform Performance */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-purple-400" />
            Platform Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Airbnb */}
            <div className="p-4 rounded border border-pink-700 bg-pink-900/20">
              <h4 className="font-semibold text-pink-400 mb-3">Airbnb</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-300">Properties Found:</span>
                  <span className="text-green-400">{summary.platform_performance.airbnb.investigated}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">No Match:</span>
                  <span className="text-blue-400">{summary.platform_performance.airbnb.no_match}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Errors:</span>
                  <span className="text-red-400">{summary.platform_performance.airbnb.errors}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Avg Confidence:</span>
                  <span className="text-yellow-400">{summary.platform_performance.airbnb.avg_confidence}</span>
                </div>
              </div>
            </div>

            {/* SpareRoom */}
            <div className="p-4 rounded border border-green-700 bg-green-900/20">
              <h4 className="font-semibold text-green-400 mb-3">SpareRoom</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-300">Properties Found:</span>
                  <span className="text-green-400">{summary.platform_performance.spareroom.investigated}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">No Match:</span>
                  <span className="text-blue-400">{summary.platform_performance.spareroom.no_match}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Errors:</span>
                  <span className="text-red-400">{summary.platform_performance.spareroom.errors}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Avg Confidence:</span>
                  <span className="text-yellow-400">{summary.platform_performance.spareroom.avg_confidence}</span>
                </div>
              </div>
            </div>

            {/* Gumtree */}
            <div className="p-4 rounded border border-yellow-700 bg-yellow-900/20">
              <h4 className="font-semibold text-yellow-400 mb-3">Gumtree</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-300">Properties Found:</span>
                  <span className="text-green-400">{summary.platform_performance.gumtree.investigated}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">No Match:</span>
                  <span className="text-blue-400">{summary.platform_performance.gumtree.no_match}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Errors:</span>
                  <span className="text-red-400">{summary.platform_performance.gumtree.errors}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Avg Confidence:</span>
                  <span className="text-yellow-400">{summary.platform_performance.gumtree.avg_confidence}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Usage & Recommendations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ScrapingBee Usage */}
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-green-400" />
              ScrapingBee Usage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Requests Used:</span>
                <span className="text-green-400 font-bold">
                  {summary.scraping_bee_usage.requestsUsed}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Requests Remaining:</span>
                <span className="text-blue-400 font-bold">
                  {summary.scraping_bee_usage.requestsRemaining}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Daily Limit:</span>
                <span className="text-purple-400 font-bold">
                  {summary.scraping_bee_usage.dailyLimit}
                </span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2 mt-3">
                <div 
                  className="bg-green-400 h-2 rounded-full transition-all duration-300" 
                  style={{ 
                    width: `${(summary.scraping_bee_usage.requestsUsed / summary.scraping_bee_usage.dailyLimit) * 100}%` 
                  }}
                ></div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recommendations */}
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">Recommendations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {summary.recommendations.map((recommendation, index) => (
                <div key={index} className="text-sm text-gray-300 flex items-start gap-2">
                  <span className="text-blue-400 mt-1">•</span>
                  <span>{recommendation}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
