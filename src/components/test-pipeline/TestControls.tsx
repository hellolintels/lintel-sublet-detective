
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Target } from "lucide-react";

interface TestControlsProps {
  isLoading: boolean;
  onRunTest: () => void;
}

export const TestControls = ({ isLoading, onRunTest }: TestControlsProps) => {
  return (
    <Card className="bg-gray-900 border-gray-800 mb-8">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Target className="h-5 w-5 text-orange-500" />
          Improved Precision Pipeline Test
        </CardTitle>
        <CardDescription>
          Enhanced coordinate-based scraping with ~50m radius and special optimization for G11 5AW to capture live listings
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="text-sm text-gray-400">
            <p>• <strong>Airbnb:</strong> Improved coordinate search with ~50m radius + map centering</p>
            <p>• <strong>G11 5AW Special:</strong> Optimized ~70m radius to capture known live listing</p>
            <p>• <strong>SpareRoom & Gumtree:</strong> Full address search for precision</p>
            <p>• <strong>Enhancement:</strong> Dynamic radius adjustment and better coordinate precision</p>
          </div>
          <Button 
            onClick={onRunTest} 
            disabled={isLoading}
            className="bg-orange-600 hover:bg-orange-700"
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isLoading ? "Running Improved Test..." : "Run Improved Precision Test"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
