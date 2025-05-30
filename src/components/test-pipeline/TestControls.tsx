
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Target, MapPin } from "lucide-react";

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
          Real Scraping Test with Native Location Search
        </CardTitle>
        <CardDescription>
          Testing with real Bright Data scraping using Airbnb's native location search for accurate postcode-level results
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="text-sm text-gray-400">
            <p>• <strong>Real Scraping:</strong> Using actual Bright Data WebSocket scraping (no simulation)</p>
            <p>• <strong>Native Search:</strong> Airbnb's location search with postcode validation</p>
            <p>• <strong>Fallback Strategy:</strong> Coordinate search with 5m radius if location search fails</p>
            <p>• <strong>Validation:</strong> Filters results to ensure they match the target postcode</p>
            <p>• <strong>Accuracy:</strong> Eliminates false positives and "Over 1,000 places" issues</p>
          </div>
          <Button 
            onClick={onRunTest} 
            disabled={isLoading}
            className="bg-orange-600 hover:bg-orange-700"
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isLoading ? "Running Real Scraping Test..." : "Run Real Scraping Test"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
