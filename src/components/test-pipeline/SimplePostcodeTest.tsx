
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Loader2, AlertTriangle, TrendingUp } from "lucide-react";

interface TestResult {
  success: boolean;
  postcode: string;
  strategiesTested: number;
  successfulRequests: number;
  postcodeMatchesFound: number;
  creditsUsed: number;
  functionInvoked: boolean;
  bestResult?: any;
  allResults?: any[];
  message: string;
  timestamp: string;
  summary?: {
    totalStrategies: number;
    successfulRequests: number;
    postcodeMatches: number;
    averageResponseTime: number;
    totalHtmlReceived: number;
  };
  error?: string;
  errorDetails?: any;
}

export const SimplePostcodeTest = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);

  const runSimpleTest = async () => {
    setIsLoading(true);
    setTestResult(null);
    
    try {
      console.log("🎯 Starting enhanced G11 5AW test with multiple strategies...");
      
      const { data, error } = await supabase.functions.invoke('test-g11-5aw', {
        body: { test: true }
      });
      
      console.log("📊 Enhanced test results:", { data, error });
      
      if (error) {
        console.error("❌ Supabase function error:", error);
        toast({
          title: "Test Failed",
          description: `Function error: ${error.message || JSON.stringify(error)}`,
          variant: "destructive",
        });
        
        // Set a basic error result
        setTestResult({
          success: false,
          postcode: "G11 5AW",
          strategiesTested: 0,
          successfulRequests: 0,
          postcodeMatchesFound: 0,
          creditsUsed: 0,
          functionInvoked: false,
          message: `Function invocation failed: ${error.message || JSON.stringify(error)}`,
          timestamp: new Date().toISOString(),
          error: error.message || JSON.stringify(error)
        });
        return;
      }
      
      console.log("📊 Enhanced test results:", data);
      setTestResult(data);
      
      // Enhanced result reporting
      if (data?.success) {
        toast({
          title: "✅ Test Successful",
          description: `Found G11 5AW using ${data.postcodeMatchesFound} of ${data.strategiesTested} strategies! Used ${data.creditsUsed} credits.`,
        });
      } else {
        const creditsMsg = data?.creditsUsed ? ` (${data.creditsUsed} credits used)` : "";
        toast({
          title: "❌ Test Failed",
          description: `${data?.message || "Test completed but no postcode match found"}${creditsMsg}`,
          variant: "destructive",
        });
      }
      
    } catch (err) {
      console.error("❌ Error running enhanced test:", err);
      const errorMessage = err instanceof Error ? err.message : String(err);
      
      toast({
        title: "Error",
        description: `Failed to run enhanced test: ${errorMessage}`,
        variant: "destructive",
      });
      
      // Set a basic error result
      setTestResult({
        success: false,
        postcode: "G11 5AW",
        strategiesTested: 0,
        successfulRequests: 0,
        postcodeMatchesFound: 0,
        creditsUsed: 0,
        functionInvoked: false,
        message: `Test execution failed: ${errorMessage}`,
        timestamp: new Date().toISOString(),
        error: errorMessage
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            🎯 Enhanced G11 5AW Test
          </CardTitle>
          <CardDescription>
            Multi-strategy test to verify G11 5AW can be found on Airbnb using enhanced ScrapingBee parameters
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={runSimpleTest} 
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Testing G11 5AW with Multiple Strategies...
              </>
            ) : (
              "🔍 Run Enhanced G11 5AW Test"
            )}
          </Button>
        </CardContent>
      </Card>

      {testResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {testResult.success ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : testResult.functionInvoked ? (
                <XCircle className="h-5 w-5 text-red-500" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
              )}
              Enhanced Test Results
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant={testResult.success ? "default" : "destructive"}>
                {testResult.success ? "SUCCESS" : "FAILED"}
              </Badge>
              {testResult.functionInvoked && (
                <Badge variant="outline">Function Invoked</Badge>
              )}
              {testResult.creditsUsed > 0 && (
                <Badge variant="secondary">
                  {testResult.creditsUsed} Credits Used
                </Badge>
              )}
              {testResult.strategiesTested > 0 && (
                <Badge variant="outline">
                  {testResult.strategiesTested} Strategies
                </Badge>
              )}
            </div>

            <div className="space-y-2">
              <p className="font-medium">{testResult.message}</p>
              <div className="text-sm text-gray-600">
                <div>Postcode: {testResult.postcode}</div>
                <div>Timestamp: {new Date(testResult.timestamp).toLocaleString()}</div>
              </div>
            </div>

            {testResult.summary && (
              <div className="space-y-2">
                <h4 className="font-medium flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Performance Summary:
                </h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-2">
                    📊 Total Strategies: {testResult.summary.totalStrategies}
                  </div>
                  <div className="flex items-center gap-2">
                    ✅ Successful Requests: {testResult.summary.successfulRequests}
                  </div>
                  <div className="flex items-center gap-2">
                    🎯 Postcode Matches: {testResult.summary.postcodeMatches}
                  </div>
                  <div className="flex items-center gap-2">
                    ⏱️ Avg Response: {Math.round(testResult.summary.averageResponseTime)}ms
                  </div>
                  <div className="flex items-center gap-2">
                    📄 Total HTML: {Math.round(testResult.summary.totalHtmlReceived / 1024)}KB
                  </div>
                </div>
              </div>
            )}

            {testResult.bestResult && (
              <div className="space-y-2">
                <h4 className="font-medium">Best Result Details:</h4>
                <div className="bg-gray-100 p-3 rounded text-sm">
                  <div><strong>Strategy:</strong> {testResult.bestResult.strategy || "N/A"}</div>
                  <div><strong>URL:</strong> <code className="text-xs">{testResult.bestResult.url || "N/A"}</code></div>
                  <div><strong>Response Time:</strong> {testResult.bestResult.responseTime || 0}ms</div>
                  {testResult.bestResult.postcodeDetection && (
                    <div><strong>Detection Method:</strong> {testResult.bestResult.postcodeDetection.method} 
                      (confidence: {Math.round((testResult.bestResult.postcodeDetection.confidence || 0) * 100)}%)</div>
                  )}
                  {testResult.bestResult.htmlLength && (
                    <div><strong>HTML Length:</strong> {testResult.bestResult.htmlLength} characters</div>
                  )}
                </div>
              </div>
            )}

            {testResult.bestResult?.htmlPreview && (
              <div className="space-y-2">
                <h4 className="font-medium">HTML Preview (first 2000 chars):</h4>
                <div className="bg-gray-100 p-3 rounded text-xs font-mono overflow-x-auto max-h-40 overflow-y-auto">
                  {testResult.bestResult.htmlPreview}
                </div>
              </div>
            )}

            {(testResult.error || testResult.errorDetails) && (
              <div className="space-y-2">
                <h4 className="font-medium text-red-600">Error Details:</h4>
                <div className="bg-red-50 p-3 rounded text-sm text-red-700">
                  {testResult.error}
                  {testResult.errorDetails && (
                    <div className="mt-2 text-xs">
                      <div><strong>Name:</strong> {testResult.errorDetails.name}</div>
                      <div><strong>Message:</strong> {testResult.errorDetails.message}</div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
