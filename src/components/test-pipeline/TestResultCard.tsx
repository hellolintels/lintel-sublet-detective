
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Square, ExternalLink, Target, CheckCircle } from "lucide-react";
import { TestResult } from "@/types/test-pipeline";

interface TestResultCardProps {
  results: TestResult[];
}

const getStatusColor = (status: string) => {
  switch (status) {
    case "investigate": return "default";
    case "no_match": return "secondary";
    case "error": return "destructive";
    default: return "outline";
  }
};

const getStatusText = (status: string) => {
  switch (status) {
    case "investigate": return "Properties Found";
    case "no_match": return "No Properties";
    case "error": return "Error";
    default: return status;
  }
};

const getConfidenceColor = (confidence?: string) => {
  switch (confidence) {
    case "High": return "text-green-400";
    case "Medium": return "text-yellow-400";
    case "Low": return "text-orange-400";
    default: return "text-gray-400";
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
        className={`${color} hover:opacity-75 text-sm underline flex items-center gap-1 font-medium`}
      >
        <ExternalLink className="h-3 w-3" />
        View Live Listings
      </a>
    );
  }
  
  if (result.status === "no_match" && result.map_view_url) {
    return (
      <a 
        href={result.map_view_url} 
        target="_blank" 
        rel="noopener noreferrer"
        className={`${color} hover:opacity-75 text-sm underline flex items-center gap-1 font-medium`}
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
  <div className="space-y-3 p-3 rounded border border-gray-700">
    <div className="flex items-center justify-between">
      <span className={`font-semibold ${color}`}>{platform}</span>
      <Badge variant={getStatusColor(result.status)}>
        {getStatusText(result.status)}
      </Badge>
    </div>
    
    <div className="space-y-2">
      {result.count > 0 && (
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-blue-400" />
          <span className="text-sm text-gray-300">
            {result.count} listing{result.count > 1 ? 's' : ''} found
          </span>
        </div>
      )}
      
      {result.confidence && (
        <div className="flex items-center gap-2">
          <CheckCircle className="h-4 w-4 text-green-400" />
          <span className={`text-sm font-medium ${getConfidenceColor(result.confidence)}`}>
            {result.confidence} Confidence
          </span>
          {result.validation_score && (
            <span className="text-xs text-gray-400">
              ({result.validation_score}%)
            </span>
          )}
        </div>
      )}
      
      {result.extracted_postcode && (
        <div className="text-xs text-gray-400">
          Detected: {result.extracted_postcode}
        </div>
      )}
    </div>
    
    <VerificationLink platform={platform} result={result} color={color} />
    
    {result.status === "error" && result.message && (
      <p className="text-xs text-red-400 mt-2">{result.message}</p>
    )}
    
    {result.accuracy_reasons && result.accuracy_reasons.length > 0 && (
      <div className="text-xs text-gray-500 mt-2">
        <div className="font-medium">Validation:</div>
        <div>{result.accuracy_reasons.join(', ')}</div>
      </div>
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

  const coordinateBasedResults = results.filter(r => r.coordinates).length;

  return (
    <Card className="bg-gray-900 border-gray-800">
      <CardHeader>
        <CardTitle className="text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-green-400" />
            <span>Enhanced Property Verification Results</span>
          </div>
          <div className="flex gap-4 text-sm">
            <span className="text-green-400">{totalMatches} Properties Found</span>
            <span className="text-blue-400">{totalNoMatches} Areas Verified</span>
            <span className="text-purple-400">{coordinateBasedResults} Coordinate-Based</span>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {results.map((result, index) => (
            <div key={index} className="border border-gray-700 rounded-lg p-4 bg-gray-800/50">
              <div className="mb-4">
                <div className="flex items-center gap-3 mb-2">
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
                {result.streetName && (
                  <p className="text-gray-500 text-xs">Street: {result.streetName}</p>
                )}
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <PlatformResult 
                  platform="Airbnb" 
                  result={result.airbnb} 
                  color="text-pink-400" 
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
