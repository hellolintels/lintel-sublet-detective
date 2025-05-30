
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";
import { Loader2 } from "lucide-react";

interface TestResult {
  postcode: string;
  address: string;
  airbnb: { status: string; count: number; url?: string };
  spareroom: { status: string; count: number; url?: string };
  gumtree: { status: string; count: number; url?: string };
}

interface TestSummary {
  total_postcodes: number;
  test_completed: string;
  bright_data_connection: string;
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
      console.log("Starting test pipeline...");
      
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
      
      if (data.bright_data_connection === "success") {
        toast({
          title: "Test Completed",
          description: "Bright Data integration test completed successfully",
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

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-orange-500 mb-2">
            Bright Data Integration Test
          </h1>
          <p className="text-gray-400">
            Direct end-to-end testing of the property matching pipeline
          </p>
        </div>

        <Card className="bg-gray-900 border-gray-800 mb-8">
          <CardHeader>
            <CardTitle className="text-white">Pipeline Test</CardTitle>
            <CardDescription>
              This tests the complete Bright Data scraping pipeline with real UK postcodes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={runTest} 
              disabled={isLoading}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isLoading ? "Running Test..." : "Run End-to-End Test"}
            </Button>
          </CardContent>
        </Card>

        {testResults && (
          <div className="space-y-6">
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  Test Summary
                  <Badge variant={testResults.bright_data_connection === "success" ? "default" : "destructive"}>
                    {testResults.bright_data_connection}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="text-gray-300">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p><strong>Total Postcodes:</strong> {testResults.total_postcodes}</p>
                    <p><strong>Test Time:</strong> {new Date(testResults.test_completed).toLocaleString()}</p>
                  </div>
                  <div>
                    <p><strong>Connection:</strong> {testResults.bright_data_connection}</p>
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
                  <CardTitle className="text-white">Scraping Results</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {testResults.results.map((result, index) => (
                      <div key={index} className="border border-gray-700 rounded-lg p-4">
                        <div className="mb-3">
                          <h4 className="text-lg font-semibold text-white">{result.postcode}</h4>
                          <p className="text-gray-400 text-sm">{result.address}</p>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-blue-400">Airbnb:</span>
                              <Badge variant={getStatusColor(result.airbnb.status)}>
                                {result.airbnb.status}
                              </Badge>
                            </div>
                            {result.airbnb.count > 0 && (
                              <p className="text-sm text-gray-400">Count: {result.airbnb.count}</p>
                            )}
                            {result.airbnb.url && (
                              <a 
                                href={result.airbnb.url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-blue-400 hover:text-blue-300 text-sm underline"
                              >
                                View Search
                              </a>
                            )}
                          </div>

                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-green-400">SpareRoom:</span>
                              <Badge variant={getStatusColor(result.spareroom.status)}>
                                {result.spareroom.status}
                              </Badge>
                            </div>
                            {result.spareroom.count > 0 && (
                              <p className="text-sm text-gray-400">Count: {result.spareroom.count}</p>
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

                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-yellow-400">Gumtree:</span>
                              <Badge variant={getStatusColor(result.gumtree.status)}>
                                {result.gumtree.status}
                              </Badge>
                            </div>
                            {result.gumtree.count > 0 && (
                              <p className="text-sm text-gray-400">Count: {result.gumtree.count}</p>
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
