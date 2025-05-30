
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
      console.log("Starting postcode-area focused test pipeline...");
      
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
      
      console.log("Postcode-focused test pipeline results:", data);
      setTestResults(data);
      
      if (data.connection_status === "success") {
        toast({
          title: "Postcode Test Completed",
          description: `Postcode-area focused test completed with ${data.search_precision || 'postcode boundary targeting'}`,
        });
      } else {
        toast({
          title: "Test Issues",
          description: data.message || "Test completed with issues",
          variant: "destructive",
        });
      }
      
    } catch (err) {
      console.error("Error running postcode-focused test:", err);
      toast({
        title: "Error",
        description: "Failed to run postcode-focused test pipeline",
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
            Postcode-Focused Property Search Test
          </h1>
          <p className="text-gray-400">
            Targeted coordinate-based searches within postcode boundaries (~300-400m radius) with G11 5AW optimization
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
