
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
      console.log("🚀 Starting enhanced WebSocket connection test...");
      
      const { data, error } = await supabase.functions.invoke('test-pipeline');
      
      if (error) {
        console.error("❌ Enhanced WebSocket test error:", error);
        toast({
          title: "Test Failed",
          description: error.message || "Failed to run enhanced WebSocket test",
          variant: "destructive",
        });
        return;
      }
      
      console.log("📊 Enhanced WebSocket test results:", data);
      setTestResults(data);
      
      // Check for WebSocket connection issues
      const hasWebSocketErrors = data.results?.some((result: any) => 
        result.airbnb?.message?.includes("WebSocket") ||
        result.spareroom?.message?.includes("WebSocket") ||
        result.gumtree?.message?.includes("WebSocket")
      );
      
      const hasConnectionDiagnostics = data.results?.some((result: any) => 
        result.airbnb?.connectionDiagnostics || 
        result.spareroom?.connectionDiagnostics || 
        result.gumtree?.connectionDiagnostics
      );
      
      const hasWorkingConnection = data.results?.some((result: any) => 
        result.airbnb?.workingEndpoint || 
        result.spareroom?.workingEndpoint || 
        result.gumtree?.workingEndpoint
      );
      
      if (hasWorkingConnection) {
        toast({
          title: "WebSocket Connection Resolved!",
          description: "Found working Bright Data endpoint configuration",
        });
      } else if (hasConnectionDiagnostics) {
        toast({
          title: "WebSocket Diagnostics Available",
          description: "Detailed connection test results available in test output",
          variant: "destructive",
        });
      } else if (hasWebSocketErrors) {
        toast({
          title: "WebSocket Connection Issues",
          description: "Multiple endpoint configurations tested - check diagnostics",
          variant: "destructive",
        });
      } else if (data.connection_status === "success") {
        toast({
          title: "Enhanced WebSocket Test Completed",
          description: "Test completed with enhanced connection diagnostics",
        });
      } else {
        toast({
          title: "Test Issues",
          description: data.message || "Test completed with issues",
          variant: "destructive",
        });
      }
      
    } catch (err) {
      console.error("❌ Error running enhanced WebSocket test:", err);
      toast({
        title: "Error",
        description: "Failed to run enhanced WebSocket test pipeline",
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
            Enhanced Bright Data WebSocket Connection Test
          </h1>
          <p className="text-gray-400">
            Multi-port testing with comprehensive diagnostics to resolve Bright Data WebSocket connection issues
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
