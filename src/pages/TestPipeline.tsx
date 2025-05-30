
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";
import { TestSummary } from "@/types/test-pipeline";
import { TestControls } from "@/components/test-pipeline/TestControls";
import { TestSummaryCard } from "@/components/test-pipeline/TestSummaryCard";
import { TestResultCard } from "@/components/test-pipeline/TestResultCard";

const TestPipeline = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [testResults, setTestResults] = useState<TestSummary | null>(null);

  const runTest = async () => {
    setIsLoading(true);
    setTestResults(null);
    
    try {
      console.log("🚀 Starting enhanced precision test with WebSocket diagnostics...");
      
      const { data, error } = await supabase.functions.invoke('test-pipeline');
      
      if (error) {
        console.error("❌ Test pipeline error:", error);
        toast({
          title: "Test Failed",
          description: error.message || "Failed to run enhanced precision test",
          variant: "destructive",
        });
        return;
      }
      
      console.log("📊 Enhanced precision test results:", data);
      setTestResults(data);
      
      // Check for WebSocket connection issues
      const hasWebSocketErrors = data.results?.some((result: any) => 
        result.airbnb?.message?.includes("WebSocket") ||
        result.spareroom?.message?.includes("WebSocket") ||
        result.gumtree?.message?.includes("WebSocket")
      );
      
      const hasBroadResults = data.results?.some((result: any) => 
        result.airbnb?.status === "too_broad"
      );
      
      if (hasWebSocketErrors) {
        toast({
          title: "WebSocket Connection Issues Detected",
          description: "Check the test results for detailed WebSocket diagnostics",
          variant: "destructive",
        });
      } else if (hasBroadResults) {
        toast({
          title: "Map Scale Issues Detected",
          description: "Some searches returned 'Over 1,000 places' - check results for refinement attempts",
          variant: "destructive",
        });
      } else if (data.connection_status === "success") {
        toast({
          title: "Enhanced Precision Test Completed",
          description: `Test completed with enhanced precision algorithms and WebSocket diagnostics`,
        });
      } else {
        toast({
          title: "Test Issues",
          description: data.message || "Test completed with issues",
          variant: "destructive",
        });
      }
      
    } catch (err) {
      console.error("❌ Error running enhanced precision test:", err);
      toast({
        title: "Error",
        description: "Failed to run enhanced precision test pipeline",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-orange-500 mb-2">
            Enhanced Precision Test with WebSocket Diagnostics
          </h1>
          <p className="text-gray-400">
            Testing property search with progressive refinement algorithms, ultra-precise coordinates, and comprehensive WebSocket connection diagnostics
          </p>
        </div>

        <TestControls isLoading={isLoading} onRunTest={runTest} />

        {testResults && (
          <div className="space-y-6">
            <TestSummaryCard testResults={testResults} />

            {testResults.results && testResults.results.length > 0 && (
              <TestResultCard results={testResults.results} />
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default TestPipeline;
