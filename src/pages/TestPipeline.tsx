
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
      console.log("Starting real scraping test pipeline with native location search...");
      
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
      
      console.log("Real scraping test pipeline results:", data);
      setTestResults(data);
      
      if (data.connection_status === "success") {
        toast({
          title: "Real Scraping Test Completed",
          description: `Test completed using real Bright Data scraping with native location search`,
        });
      } else {
        toast({
          title: "Test Issues",
          description: data.message || "Test completed with issues",
          variant: "destructive",
        });
      }
      
    } catch (err) {
      console.error("Error running real scraping test:", err);
      toast({
        title: "Error",
        description: "Failed to run real scraping test pipeline",
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
            Real Scraping Test with Native Location Search
          </h1>
          <p className="text-gray-400">
            Testing property search accuracy using real Bright Data scraping with Airbnb's native location search instead of coordinate bounding boxes
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
