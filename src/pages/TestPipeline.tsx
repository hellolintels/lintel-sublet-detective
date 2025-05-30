
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";
import { Loader2, MapPin, Target, Crosshair } from "lucide-react";

interface TestResult {
  postcode: string;
  address: string;
  coordinates?: { lat: number; lng: number };
  airbnb: { 
    status: string; 
    count: number; 
    url?: string; 
    search_method?: string;
    precision?: string;
    radius?: string;
  };
  spareroom: { 
    status: string; 
    count: number; 
    url?: string; 
    search_method?: string;
    precision?: string;
  };
  gumtree: { 
    status: string; 
    count: number; 
    url?: string; 
    search_method?: string;
    precision?: string;
  };
}

interface TestSummary {
  total_postcodes: number;
  test_completed: string;
  connection_status: string;
  coordinate_lookup?: string;
  search_precision?: string;
  results: TestResult[];
  error?: string;
  message?: string;
}

const TestPipeline = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [testResults, setTestResults] = useState<TestSummary | null>(null);

  const runTest = async () => {
    setIsLoading(true);
    setTestResults(null);
    
    try {
      console.log("Starting ultra-precise coordinate-based test pipeline...");
      
      const { data, error } = await supabase.functions.invoke('test-pipeline');
      
      if (error) {
        console.error("Test pipeline error:", error);
        toast({
          title: "Test Failed",
          description: error.message || "Failed to run test pipeline",
          variant: "destructive",
        });
        return;
      }
      
      console.log("Test pipeline results:", data);
      setTestResults(data);
      
      if (data.connection_status === "success") {
        toast({
          title: "Test Completed",
          description: `Ultra-precise test completed with ${data.search_precision || 'coordinate lookup'}`,
        });
      } else {
        toast({
          title: "Test Issues",
          description: data.message || "Test completed with issues",
          variant: "destructive",
        });
      }
      
    } catch (err) {
      console.error("Error running test:", err);
      toast({
        title: "Error",
        description: "Failed to run test pipeline",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

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

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-orange-500 mb-2">
            Ultra-Precise Property Search Test
          </h1>
          <p className="text-gray-400">
            Testing ultra-precise coordinate-based searches with ~20m radius for pinpoint property matching
          </p>
        </div>

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
                onClick={runTest} 
                disabled={isLoading}
                className="bg-orange-600 hover:bg-orange-700"
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isLoading ? "Running Ultra-Precise Test..." : "Run Ultra-Precise Test"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {testResults && (
          <div className="space-y-6">
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  Test Summary
                  <Badge variant={testResults.connection_status === "success" ? "default" : "destructive"}>
                    {testResults.connection_status}
                  </Badge>
                  {testResults.coordinate_lookup && (
                    <Badge variant="outline" className="text-green-400 border-green-400">
                      {testResults.coordinate_lookup}
                    </Badge>
                  )}
                  {testResults.search_precision && (
                    <Badge variant="outline" className="text-emerald-400 border-emerald-400">
                      {testResults.search_precision}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-gray-300">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p><strong>Total Postcodes:</strong> {testResults.total_postcodes}</p>
                    <p><strong>Test Time:</strong> {new Date(testResults.test_completed).toLocaleString()}</p>
                  </div>
                  <div>
                    <p><strong>Connection:</strong> {testResults.connection_status}</p>
                    {testResults.search_precision && (
                      <p><strong>Precision:</strong> {testResults.search_precision}</p>
                    )}
                    {testResults.error && (
                      <p className="text-red-400"><strong>Error:</strong> {testResults.error}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {testResults.results && testResults.results.length > 0 && (
              <Card className="bg-gray-900 border-gray-800">
                <CardHeader>
                  <CardTitle className="text-white">Ultra-Precise Scraping Results</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {testResults.results.map((result, index) => (
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
                          </div>
                          <p className="text-gray-400 text-sm">{result.address}</p>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {/* Airbnb Results */}
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium text-blue-400">Airbnb:</span>
                              <Badge variant={getStatusColor(result.airbnb.status)}>
                                {result.airbnb.status}
                              </Badge>
                              {result.airbnb.precision && (
                                <span className={`px-2 py-1 text-xs rounded ${getPrecisionColor(result.airbnb.precision)} text-white`}>
                                  {result.airbnb.precision}
                                </span>
                              )}
                              {result.airbnb.radius && (
                                <span className="px-2 py-1 text-xs rounded bg-purple-600 text-white">
                                  {result.airbnb.radius}
                                </span>
                              )}
                            </div>
                            {result.airbnb.count > 0 && (
                              <p className="text-sm text-gray-400">Count: {result.airbnb.count}</p>
                            )}
                            {result.airbnb.search_method && (
                              <p className="text-xs text-gray-500">Method: {result.airbnb.search_method}</p>
                            )}
                            {result.airbnb.url && (
                              <a 
                                href={result.airbnb.url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-blue-400 hover:text-blue-300 text-sm underline"
                              >
                                View Ultra-Precise Search
                              </a>
                            )}
                          </div>

                          {/* SpareRoom Results */}
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-green-400">SpareRoom:</span>
                              <Badge variant={getStatusColor(result.spareroom.status)}>
                                {result.spareroom.status}
                              </Badge>
                              {result.spareroom.precision && (
                                <span className={`px-2 py-1 text-xs rounded ${getPrecisionColor(result.spareroom.precision)} text-white`}>
                                  {result.spareroom.precision}
                                </span>
                              )}
                            </div>
                            {result.spareroom.count > 0 && (
                              <p className="text-sm text-gray-400">Count: {result.spareroom.count}</p>
                            )}
                            {result.spareroom.search_method && (
                              <p className="text-xs text-gray-500">Method: {result.spareroom.search_method}</p>
                            )}
                            {result.spareroom.url && (
                              <a 
                                href={result.spareroom.url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-green-400 hover:text-green-300 text-sm underline"
                              >
                                View Search
                              </a>
                            )}
                          </div>

                          {/* Gumtree Results */}
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-yellow-400">Gumtree:</span>
                              <Badge variant={getStatusColor(result.gumtree.status)}>
                                {result.gumtree.status}
                              </Badge>
                              {result.gumtree.precision && (
                                <span className={`px-2 py-1 text-xs rounded ${getPrecisionColor(result.gumtree.precision)} text-white`}>
                                  {result.gumtree.precision}
                                </span>
                              )}
                            </div>
                            {result.gumtree.count > 0 && (
                              <p className="text-sm text-gray-400">Count: {result.gumtree.count}</p>
                            )}
                            {result.gumtree.search_method && (
                              <p className="text-xs text-gray-500">Method: {result.gumtree.search_method}</p>
                            )}
                            {result.gumtree.url && (
                              <a 
                                href={result.gumtree.url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-yellow-400 hover:text-yellow-300 text-sm underline"
                              >
                                View Search
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default TestPipeline;
