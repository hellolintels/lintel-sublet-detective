
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Target, MapPin, Wifi, WifiOff, Zap, CheckCircle, AlertCircle } from "lucide-react";

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
          Enhanced Airbnb WebSocket Connection & Scraping Test
        </CardTitle>
        <CardDescription>
          Comprehensive testing pipeline with multi-port WebSocket diagnostics and multi-strategy Airbnb scraping
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          
          {/* Phase breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-800 p-3 rounded">
              <div className="flex items-center gap-2 mb-2">
                <Wifi className="h-4 w-4 text-blue-500" />
                <span className="font-medium text-white">Phase 1: WebSocket</span>
              </div>
              <ul className="text-xs text-gray-300 space-y-1">
                <li>• Test ports 22225, 24000, 9222</li>
                <li>• Connection speed analysis</li>
                <li>• Error classification</li>
                <li>• Communication validation</li>
              </ul>
            </div>
            
            <div className="bg-gray-800 p-3 rounded">
              <div className="flex items-center gap-2 mb-2">
                <Target className="h-4 w-4 text-green-500" />
                <span className="font-medium text-white">Phase 2: Airbnb Scraping</span>
              </div>
              <ul className="text-xs text-gray-300 space-y-1">
                <li>• Ultra-precise coordinates (20m)</li>
                <li>• Full address search</li>
                <li>• Street + postcode</li>
                <li>• Postcode-only fallback</li>
                <li>• Place ID search</li>
              </ul>
            </div>
            
            <div className="bg-gray-800 p-3 rounded">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="h-4 w-4 text-purple-500" />
                <span className="font-medium text-white">Phase 3: Analysis</span>
              </div>
              <ul className="text-xs text-gray-300 space-y-1">
                <li>• Strategy effectiveness</li>
                <li>• Error pattern analysis</li>
                <li>• Performance metrics</li>
                <li>• Optimization recommendations</li>
              </ul>
            </div>
          </div>
          
          {/* Key improvements */}
          <div className="bg-gradient-to-r from-orange-900/20 to-red-900/20 p-3 rounded border border-orange-500/20">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="h-4 w-4 text-orange-500" />
              <span className="font-medium text-orange-400">Enhanced Testing Features</span>
            </div>
            <div className="text-sm text-gray-300">
              <p><strong>Multi-Strategy Search:</strong> 5 different search approaches for maximum coverage</p>
              <p><strong>Smart Diagnostics:</strong> Automatic error classification and resolution recommendations</p>
              <p><strong>Performance Analysis:</strong> Connection speed, success rates, and strategy effectiveness</p>
              <p><strong>Real-time Feedback:</strong> Detailed logging and progress tracking for each test phase</p>
            </div>
          </div>
          
          <div className="bg-gray-800 p-3 rounded text-xs text-gray-300">
            <div className="flex items-center gap-2 mb-2">
              <MapPin className="h-4 w-4 text-green-500" />
              <span>Test Coverage: 5 Edinburgh/Glasgow postcodes with building-level coordinates</span>
            </div>
            <p>This comprehensive test will identify the optimal WebSocket configuration and validate all Airbnb search strategies to ensure reliable property matching.</p>
          </div>
          
          <Button 
            onClick={onRunTest} 
            disabled={isLoading}
            className="bg-orange-600 hover:bg-orange-700 w-full"
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isLoading ? "Running Enhanced Test Pipeline..." : "Run Enhanced WebSocket & Airbnb Test"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
