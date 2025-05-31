
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
      console.log("🔍 Starting property search result verification...");
      
      const { data, error } = await supabase.functions.invoke('test-pipeline');
      
      if (error) {
        console.error("❌ Property search verification error:", error);
        toast({
          title: "Verification Failed",
          description: error.message || "Failed to run property search verification",
          variant: "destructive",
        });
        return;
      }
      
      console.log("📊 Property search verification results:", data);
      setTestResults(data);
      
      // Focus on verification results
      if (data.overall_success) {
        const totalMatches = data.results?.reduce((count, result) => {
          if (result.airbnb?.status === "investigate") count++;
          if (result.spareroom?.status === "investigate") count++;
          if (result.gumtree?.status === "investigate") count++;
          return count;
        }, 0) || 0;
        
        toast({
          title: "✅ Property Search Verification Complete",
          description: `Found ${totalMatches} properties requiring verification across all postcodes`,
        });
      } else {
        const noMatchCount = data.results?.reduce((count, result) => {
          if (result.airbnb?.status === "no_match") count++;
          if (result.spareroom?.status === "no_match") count++;
          if (result.gumtree?.status === "no_match") count++;
          return count;
        }, 0) || 0;
        
        toast({
          title: "🔍 Verification Results Mixed",
          description: `${noMatchCount} search areas need verification for no listings found`,
          variant: "default",
        });
      }
      
    } catch (err) {
      console.error("❌ Error running property search verification:", err);
      toast({
        title: "Error",
        description: "Failed to run property search verification - check console for details",
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
            Property Search Result Verification
          </h1>
          <p className="text-gray-400">
            Verify the accuracy of property search results for specific postcodes. Each result links directly to live listings or map views for manual verification.
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
