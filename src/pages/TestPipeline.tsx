
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
      
      // More detailed success/failure analysis
      if (data.api_status === "success" && data.overall_success) {
        toast({
          title: "✅ ScrapingBee API Test Successful!",
          description: `API working reliably with ${data.api_diagnostics?.success_rate || 'good'} success rate`,
        });
      } else if (data.api_status === "success") {
        // API works but results are mixed
        const successfulPlatforms = data.results?.reduce((count, result) => {
          if (result.airbnb?.status === "investigate" && result.airbnb?.count > 0) count++;
          if (result.spareroom?.status === "investigate" && result.spareroom?.count > 0) count++;
          if (result.gumtree?.status === "investigate" && result.gumtree?.count > 0) count++;
          return count;
        }, 0) || 0;
        
        toast({
          title: "⚡ ScrapingBee Test Completed",
          description: `API working, found results on ${successfulPlatforms} platform searches - check details`,
          variant: "default",
        });
      } else {
        // API failed or major issues
        const errorMessage = data.recommendations?.length > 0 
          ? data.recommendations[0] 
          : "Check API key configuration and account status";
          
        toast({
          title: "❌ ScrapingBee API Issues",
          description: errorMessage,
          variant: "destructive",
        });
      }
      
    } catch (err) {
      console.error("❌ Error running ScrapingBee API test:", err);
      toast({
        title: "Error",
        description: "Failed to run ScrapingBee API test pipeline - check console for details",
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
