
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Crosshair } from "lucide-react";

interface TestControlsProps {
  isLoading: boolean;
  onRunTest: () => void;
}

export const TestControls = ({ isLoading, onRunTest }: TestControlsProps) => {
  return (
    <Card className="bg-gray-900 border-gray-800 mb-8">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Crosshair className="h-5 w-5 text-orange-500" />
          Ultra-Precise Pipeline Test
        </CardTitle>
        <CardDescription>
          This tests ultra-precise coordinate-based scraping with ~20m radius positioning and zoom=17 map view to eliminate false positives
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="text-sm text-gray-400">
            <p>• <strong>Airbnb:</strong> Ultra-precise coordinate search with ~20m radius + zoom=17</p>
            <p>• <strong>SpareRoom & Gumtree:</strong> Full address search for precision</p>
            <p>• <strong>Target Area:</strong> Edinburgh & Glasgow specific properties</p>
            <p>• <strong>Test Case:</strong> G11 5AW (23 Banavie Road) for reference</p>
          </div>
          <Button 
            onClick={onRunTest} 
            disabled={isLoading}
            className="bg-orange-600 hover:bg-orange-700"
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isLoading ? "Running Ultra-Precise Test..." : "Run Ultra-Precise Test"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
