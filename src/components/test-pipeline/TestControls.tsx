
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Target, MapPin, Wifi, WifiOff, Zap } from "lucide-react";

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
          Enhanced Bright Data WebSocket Connection Test
        </CardTitle>
        <CardDescription>
          Multi-port testing with comprehensive diagnostics to resolve WebSocket connection issues
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="text-sm text-gray-400">
            <p>• <strong>Multi-Port Testing:</strong> Automatically tests ports 22225, 24000, and 9222</p>
            <p>• <strong>Connection Diagnostics:</strong> Detailed error analysis and configuration validation</p>
            <p>• <strong>Enhanced Error Handling:</strong> Specific error classification and recommended actions</p>
            <p>• <strong>Optimized Timeouts:</strong> Faster connection testing with 30s timeouts</p>
            <p>• <strong>Progressive Search:</strong> Ultra-precise coordinates → Native location → Place ID fallback</p>
            <p>• <strong>Real-time Monitoring:</strong> Live connection status and performance metrics</p>
          </div>
          
          <div className="bg-gray-800 p-3 rounded text-xs text-gray-300">
            <div className="flex items-center gap-2 mb-2">
              <Target className="h-4 w-4 text-green-500" />
              <span>WebSocket Connection Resolution</span>
            </div>
            <p>This enhanced test will systematically find the correct Bright Data WebSocket configuration by testing all available ports and providing detailed diagnostics for any connection issues.</p>
          </div>
          
          <Button 
            onClick={onRunTest} 
            disabled={isLoading}
            className="bg-orange-600 hover:bg-orange-700"
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isLoading ? "Running Enhanced WebSocket Test..." : "Run Enhanced WebSocket Test"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
