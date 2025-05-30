
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Square } from "lucide-react";
import { TestResult } from "@/types/test-pipeline";

interface TestResultCardProps {
  results: TestResult[];
}

const getStatusColor = (status: string) => {
  switch (status) {
    case "investigate": return "destructive";
    case "no_match": return "secondary";
    case "error": return "destructive";
    default: return "outline";
  }
};

const getPrecisionColor = (precision?: string) => {
  switch (precision) {
    case "ultra-high": return "bg-emerald-500";
    case "high": return "bg-green-500";
    case "medium": return "bg-yellow-500";
    case "low": return "bg-red-500";
    default: return "bg-gray-500";
  }
};

const PlatformResult = ({ 
  platform, 
  result, 
  color 
}: { 
  platform: string; 
  result: TestResult['airbnb']; 
  color: string;
}) => (
  <div className="space-y-2">
    <div className="flex items-center gap-2 flex-wrap">
      <span className={`font-medium ${color}`}>{platform}:</span>
      <Badge variant={getStatusColor(result.status)}>
        {result.status}
      </Badge>
      {result.precision && (
        <span className={`px-2 py-1 text-xs rounded ${getPrecisionColor(result.precision)} text-white`}>
          {result.precision}
        </span>
      )}
      {result.boundary_method && (
        <span className="px-2 py-1 text-xs rounded bg-blue-600 text-white">
          {result.boundary_method}
        </span>
      )}
    </div>
    {result.count > 0 && (
      <p className="text-sm text-gray-400">Count: {result.count}</p>
    )}
    {result.search_method && (
      <p className="text-xs text-gray-500">Method: {result.search_method}</p>
    )}
    {result.url && (
      <a 
        href={result.url} 
        target="_blank" 
        rel="noopener noreferrer"
        className={`${color} hover:opacity-75 text-sm underline`}
      >
        View {platform === "Airbnb" ? "OS Boundary " : ""}Search
      </a>
    )}
  </div>
);

export const TestResultCard = ({ results }: TestResultCardProps) => {
  return (
    <Card className="bg-gray-900 border-gray-800">
      <CardHeader>
        <CardTitle className="text-white">OS Data Hub Boundary-Based Results</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {results.map((result, index) => (
            <div key={index} className="border border-gray-700 rounded-lg p-4">
              <div className="mb-3">
                <div className="flex items-center gap-2 mb-2">
                  <h4 className="text-lg font-semibold text-white">{result.postcode}</h4>
                  {result.coordinates && (
                    <div className="flex items-center gap-1 text-green-400 text-sm">
                      <MapPin className="h-4 w-4" />
                      <span>{result.coordinates.lat.toFixed(6)}, {result.coordinates.lng.toFixed(6)}</span>
                    </div>
                  )}
                  {result.boundary && (
                    <div className="flex items-center gap-1 text-blue-400 text-sm">
                      <Square className="h-4 w-4" />
                      <span>OS Boundary</span>
                    </div>
                  )}
                </div>
                <p className="text-gray-400 text-sm">{result.address}</p>
                {result.boundary && (
                  <p className="text-xs text-blue-300 mt-1">
                    Boundary: SW({result.boundary.southwest.lat.toFixed(6)}, {result.boundary.southwest.lng.toFixed(6)}) 
                    NE({result.boundary.northeast.lat.toFixed(6)}, {result.boundary.northeast.lng.toFixed(6)})
                  </p>
                )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <PlatformResult 
                  platform="Airbnb" 
                  result={result.airbnb} 
                  color="text-blue-400" 
                />
                <PlatformResult 
                  platform="SpareRoom" 
                  result={result.spareroom} 
                  color="text-green-400" 
                />
                <PlatformResult 
                  platform="Gumtree" 
                  result={result.gumtree} 
                  color="text-yellow-400" 
                />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
