
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
      console.log("🚀 Starting ScrapingBee API test...");
      
      const { data, error } = await supabase.functions.invoke('test-pipeline');
      
      if (error) {
        console.error("❌ ScrapingBee API test error:", error);
        toast({
          title: "Test Failed",
          description: error.message || "Failed to run ScrapingBee API test",
          variant: "destructive",
        });
        return;
      }
      
      console.log("📊 ScrapingBee API test results:", data);
      setTestResults(data);
      
      // Check for API issues
      const hasApiErrors = data.results?.some((result: any) => 
        result.airbnb?.status === "error" ||
        result.spareroom?.status === "error" ||
        result.gumtree?.status === "error"
      );
      
      const hasHighSuccessRate = data.performance?.airbnb_success_rate || 
        data.performance?.spareroom_success_rate || 
        data.performance?.gumtree_success_rate;
      
      if (data.api_status === "success" && !hasApiErrors) {
        toast({
          title: "ScrapingBee API Test Successful!",
          description: "API is working reliably and ready for production use",
        });
      } else if (hasHighSuccessRate) {
        toast({
          title: "ScrapingBee Test Completed",
          description: "Some platforms working - check detailed results for specifics",
          variant: "default",
        });
      } else if (hasApiErrors) {
        toast({
          title: "ScrapingBee API Issues Detected",
          description: "Check API key configuration and account status",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Test Issues",
          description: data.message || "Test completed with issues - check detailed results",
          variant: "destructive",
        });
      }
      
    } catch (err) {
      console.error("❌ Error running ScrapingBee API test:", err);
      toast({
        title: "Error",
        description: "Failed to run ScrapingBee API test pipeline",
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
          <h1 className="text-3xl font-bold text-green-500 mb-2">
            ScrapingBee API Reliability Test
          </h1>
          <p className="text-gray-400">
            Comprehensive testing of ScrapingBee REST API for reliable property scraping across multiple platforms
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
