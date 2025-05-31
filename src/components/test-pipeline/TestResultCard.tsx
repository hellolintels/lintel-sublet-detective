
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Square, ExternalLink } from "lucide-react";
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

const getStatusText = (status: string) => {
  switch (status) {
    case "investigate": return "Property Found";
    case "no_match": return "No Listings";
    case "error": return "Error";
    default: return status;
  }
};

const VerificationLink = ({ 
  platform, 
  result, 
  color 
}: { 
  platform: string; 
  result: TestResult['airbnb']; 
  color: string;
}) => {
  if (result.status === "investigate" && result.listing_url) {
    return (
      <a 
        href={result.listing_url} 
        target="_blank" 
        rel="noopener noreferrer"
        className={`${color} hover:opacity-75 text-sm underline flex items-center gap-1`}
      >
        <ExternalLink className="h-3 w-3" />
        View Live Listing
      </a>
    );
  }
  
  if (result.status === "no_match" && result.map_view_url) {
    return (
      <a 
        href={result.map_view_url} 
        target="_blank" 
        rel="noopener noreferrer"
        className={`${color} hover:opacity-75 text-sm underline flex items-center gap-1`}
      >
        <ExternalLink className="h-3 w-3" />
        Verify Search Area
      </a>
    );
  }
  
  return null;
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
        {getStatusText(result.status)}
      </Badge>
      {result.confidence && (
        <span className="px-2 py-1 text-xs rounded bg-blue-600 text-white">
          {result.confidence} confidence
        </span>
      )}
    </div>
    
    {result.count > 0 && (
      <p className="text-sm text-gray-400">
        {result.count} listing{result.count > 1 ? 's' : ''} found
      </p>
    )}
    
    <VerificationLink platform={platform} result={result} color={color} />
    
    {result.status === "error" && result.message && (
      <p className="text-xs text-red-400">{result.message}</p>
    )}
  </div>
);

export const TestResultCard = ({ results }: TestResultCardProps) => {
  const totalMatches = results.reduce((sum, result) => {
    return sum + 
      (result.airbnb.status === "investigate" ? 1 : 0) +
      (result.spareroom.status === "investigate" ? 1 : 0) +
      (result.gumtree.status === "investigate" ? 1 : 0);
  }, 0);

  const totalNoMatches = results.reduce((sum, result) => {
    return sum + 
      (result.airbnb.status === "no_match" ? 1 : 0) +
      (result.spareroom.status === "no_match" ? 1 : 0) +
      (result.gumtree.status === "no_match" ? 1 : 0);
  }, 0);

  return (
    <Card className="bg-gray-900 border-gray-800">
      <CardHeader>
        <CardTitle className="text-white flex items-center justify-between">
          <span>Property Search Verification Results</span>
          <div className="flex gap-4 text-sm">
            <span className="text-green-400">{totalMatches} Properties Found</span>
            <span className="text-gray-400">{totalNoMatches} Areas to Verify</span>
          </div>
        </CardTitle>
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
                      <span>Precise Boundary</span>
                    </div>
                  )}
                </div>
                <p className="text-gray-400 text-sm">{result.address}</p>
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
