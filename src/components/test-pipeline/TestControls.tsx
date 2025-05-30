
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
          OS Data Hub Boundary-Based Pipeline Test
        </CardTitle>
        <CardDescription>
          Precision scraping using official Ordnance Survey postcode boundaries for maximum geographic accuracy
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="text-sm text-gray-400">
            <p>• <strong>OS Data Hub:</strong> Official Ordnance Survey postcode polygon boundaries</p>
            <p>• <strong>Airbnb:</strong> Precise boundary coordinate search using official postcode edges</p>
            <p>• <strong>G11 5AW Special:</strong> OS boundary ensures capture of known live listing</p>
            <p>• <strong>SpareRoom & Gumtree:</strong> Full address search for precision</p>
            <p>• <strong>Accuracy:</strong> Uses government-official postcode boundaries instead of guessed circles</p>
          </div>
          <Button 
            onClick={onRunTest} 
            disabled={isLoading}
            className="bg-orange-600 hover:bg-orange-700"
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isLoading ? "Running OS Boundary Test..." : "Run OS Data Hub Boundary Test"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
