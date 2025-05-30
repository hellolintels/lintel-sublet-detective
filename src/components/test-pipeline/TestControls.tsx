
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Target, MapPin, Wifi, WifiOff } from "lucide-react";

interface TestControlsProps {
  isLoading: boolean;
  onRunTest: () => void;
}

export const TestControls = ({ isLoading, onRunTest }: TestControlsProps) => {
  return (
    <Card className="bg-gray-900 border-gray-800 mb-8">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <MapPin className="h-5 w-5 text-orange-500" />
          Enhanced Precision Test with WebSocket Diagnostics
        </CardTitle>
        <CardDescription>
          Testing with enhanced precision algorithms, progressive search refinement, and comprehensive WebSocket diagnostics
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="text-sm text-gray-400">
            <p>• <strong>WebSocket Connection:</strong> Real-time diagnostics for Bright Data connectivity</p>
            <p>• <strong>Progressive Refinement:</strong> Ultra-precise coordinates → Native location → Place ID fallback</p>
            <p>• <strong>Enhanced Precision:</strong> 20m radius with zoom=20 for postcode-level accuracy</p>
            <p>• <strong>Smart Detection:</strong> Automatically detects "Over 1,000 places" and refines search</p>
            <p>• <strong>Comprehensive Logging:</strong> Detailed error messages and connection status</p>
          </div>
          
          <div className="bg-gray-800 p-3 rounded text-xs text-gray-300">
            <div className="flex items-center gap-2 mb-2">
              <Wifi className="h-4 w-4 text-green-500" />
              <span>WebSocket Status Monitoring</span>
            </div>
            <p>This test will show detailed connection diagnostics if WebSocket issues are detected.</p>
          </div>
          
          <Button 
            onClick={onRunTest} 
            disabled={isLoading}
            className="bg-orange-600 hover:bg-orange-700"
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isLoading ? "Running Enhanced Precision Test..." : "Run Enhanced Precision Test"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
