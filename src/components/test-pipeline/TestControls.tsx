
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Target, MapPin, Zap, CheckCircle, AlertCircle, Globe } from "lucide-react";

interface TestControlsProps {
  isLoading: boolean;
  onRunTest: () => void;
}

export const TestControls = ({ isLoading, onRunTest }: TestControlsProps) => {
  return (
    <Card className="bg-gray-900 border-gray-800 mb-8">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Zap className="h-5 w-5 text-orange-500" />
          ScrapingBee API Reliability Test
        </CardTitle>
        <CardDescription>
          Comprehensive testing pipeline using ScrapingBee REST API for reliable property scraping across multiple platforms
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          
          {/* Phase breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-800 p-3 rounded">
              <div className="flex items-center gap-2 mb-2">
                <Globe className="h-4 w-4 text-blue-500" />
                <span className="font-medium text-white">Phase 1: API Testing</span>
              </div>
              <ul className="text-xs text-gray-300 space-y-1">
                <li>• ScrapingBee connectivity</li>
                <li>• Response time analysis</li>
                <li>• Rate limit validation</li>
                <li>• Error classification</li>
              </ul>
            </div>
            
            <div className="bg-gray-800 p-3 rounded">
              <div className="flex items-center gap-2 mb-2">
                <Target className="h-4 w-4 text-green-500" />
                <span className="font-medium text-white">Phase 2: Property Scraping</span>
              </div>
              <ul className="text-xs text-gray-300 space-y-1">
                <li>• Airbnb property search</li>
                <li>• SpareRoom rental listings</li>
                <li>• Gumtree property ads</li>
                <li>• Address matching validation</li>
              </ul>
            </div>
            
            <div className="bg-gray-800 p-3 rounded">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="h-4 w-4 text-purple-500" />
                <span className="font-medium text-white">Phase 3: Analysis</span>
              </div>
              <ul className="text-xs text-gray-300 space-y-1">
                <li>• Success rate metrics</li>
                <li>• Performance benchmarks</li>
                <li>• Confidence scoring</li>
                <li>• Production readiness</li>
              </ul>
            </div>
          </div>
          
          {/* Key improvements */}
          <div className="bg-gradient-to-r from-green-900/20 to-blue-900/20 p-3 rounded border border-green-500/20">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="h-4 w-4 text-green-500" />
              <span className="font-medium text-green-400">ScrapingBee Advantages</span>
            </div>
            <div className="text-sm text-gray-300">
              <p><strong>Reliable REST API:</strong> No complex WebSocket connections or protocol issues</p>
              <p><strong>Cost Efficient:</strong> Pay per request model with transparent pricing</p>
              <p><strong>Built-in Rendering:</strong> JavaScript execution and modern website support</p>
              <p><strong>Rate Limiting:</strong> Clear API limits with proper error handling</p>
            </div>
          </div>
          
          <div className="bg-gray-800 p-3 rounded text-xs text-gray-300">
            <div className="flex items-center gap-2 mb-2">
              <MapPin className="h-4 w-4 text-green-500" />
              <span>Test Coverage: 5 Edinburgh/Glasgow postcodes with building-level coordinates</span>
            </div>
            <p>This test validates ScrapingBee's API reliability and property matching accuracy across Airbnb, SpareRoom, and Gumtree to ensure consistent production performance.</p>
          </div>
          
          <Button 
            onClick={onRunTest} 
            disabled={isLoading}
            className="bg-green-600 hover:bg-green-700 w-full"
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isLoading ? "Running ScrapingBee API Test..." : "Run ScrapingBee Reliability Test"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
