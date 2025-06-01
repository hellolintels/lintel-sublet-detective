
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";
import { TestSummary } from "@/types/test-pipeline";
import { TestControls } from "@/components/test-pipeline/TestControls";
import { TestSummaryCard } from "@/components/test-pipeline/TestSummaryCard";
import { TestResultCard } from "@/components/test-pipeline/TestResultCard";
import { SimplePostcodeTest } from "@/components/test-pipeline/SimplePostcodeTest";
import { Target, Zap } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const TestPipeline = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [testResults, setTestResults] = useState<TestSummary | null>(null);

  const runTest = async () => {
    setIsLoading(true);
    setTestResults(null);
    
    try {
      console.log("🎯 Starting Enhanced Property Search Verification with ScrapingBee...");
      
      const { data, error } = await supabase.functions.invoke('test-pipeline');
      
      if (error) {
        console.error("❌ Enhanced verification error:", error);
        toast({
          title: "Verification Failed",
          description: error.message || "Failed to run enhanced property search verification",
          variant: "destructive",
        });
        return;
      }
      
      console.log("📊 Enhanced verification results:", data);
      setTestResults(data);
      
      // Enhanced result reporting
      if (data.overall_success) {
        const totalMatches = data.results?.reduce((count, result) => {
          if (result.airbnb?.status === "investigate") count++;
          if (result.spareroom?.status === "investigate") count++;
          if (result.gumtree?.status === "investigate") count++;
          return count;
        }, 0) || 0;
        
        const coordinateBasedResults = data.results?.filter(r => r.coordinates).length || 0;
        
        toast({
          title: "✅ Enhanced Verification Complete",
          description: `Found ${totalMatches} properties requiring verification. ${coordinateBasedResults} searches used precise coordinates.`,
        });
      } else {
        const totalErrors = data.results?.reduce((count, result) => {
          if (result.airbnb?.status === "error") count++;
          if (result.spareroom?.status === "error") count++;
          if (result.gumtree?.status === "error") count++;
          return count;
        }, 0) || 0;
        
        toast({
          title: "⚠️ Verification Completed with Issues",
          description: `Verification completed but encountered ${totalErrors} errors. Check results for details.`,
          variant: "default",
        });
      }
      
    } catch (err) {
      console.error("❌ Error running enhanced verification:", err);
      toast({
        title: "Error",
        description: "Failed to run enhanced property search verification - check console for details",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Target className="h-8 w-8 text-green-400" />
            <h1 className="text-4xl font-bold text-green-500">
              Property Search Testing
            </h1>
            <Zap className="h-6 w-6 text-yellow-400" />
          </div>
          <div className="space-y-2 text-gray-400">
            <p className="text-lg">
              Test property search accuracy across platforms using ScrapingBee.
            </p>
          </div>
        </div>

        <Tabs defaultValue="simple" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="simple">🎯 Simple G11 5AW Test</TabsTrigger>
            <TabsTrigger value="full">🔍 Full Pipeline Test</TabsTrigger>
          </TabsList>
          
          <TabsContent value="simple" className="space-y-6">
            <SimplePostcodeTest />
          </TabsContent>
          
          <TabsContent value="full" className="space-y-6">
            <TestControls isLoading={isLoading} onRunTest={runTest} />

            {testResults && (
              <div className="space-y-6">
                <TestSummaryCard testResults={testResults} />

                {testResults.results && testResults.results.length > 0 && (
                  <TestResultCard results={testResults.results} />
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default TestPipeline;
