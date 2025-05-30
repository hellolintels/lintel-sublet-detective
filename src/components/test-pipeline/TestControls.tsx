
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
          OS Places API Street-Level Precision Pipeline Test
        </CardTitle>
        <CardDescription>
          Street-level scraping using OS Places API coordinates with 20-25m radius for optimal map accuracy
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="text-sm text-gray-400">
            <p>• <strong>OS Places API:</strong> Building-level coordinates from official Ordnance Survey</p>
            <p>• <strong>Airbnb:</strong> Street-level 20-25m radius search with zoom level 18 for precise view</p>
            <p>• <strong>G11 5AW Special:</strong> Precise map view showing only 2-3 nearby properties</p>
            <p>• <strong>SpareRoom & Gumtree:</strong> Full address search for precision</p>
            <p>• <strong>Accuracy:</strong> Street-level map precision eliminating false positives</p>
          </div>
          <Button 
            onClick={onRunTest} 
            disabled={isLoading}
            className="bg-orange-600 hover:bg-orange-700"
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isLoading ? "Running Street-Level Test..." : "Run Street-Level Precision Test"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
