
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";

interface TestResult {
  success: boolean;
  postcode: string;
  searchUrl: string;
  responseTime: number;
  htmlLength: number;
  htmlPreview: string;
  checks: {
    postcodeFound: boolean;
    listingsFound: boolean;
    hasGlasgow: boolean;
    hasScotland: boolean;
    hasG11: boolean;
    has5AW: boolean;
  };
  message: string;
  timestamp: string;
  error?: string;
  details?: string;
}

export const SimplePostcodeTest = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);

  const runSimpleTest = async () => {
    setIsLoading(true);
    setTestResult(null);
    
    try {
      console.log("🎯 Starting simple G11 5AW test...");
      
      const { data, error } = await supabase.functions.invoke('test-g11-5aw');
      
      if (error) {
        console.error("❌ Test error:", error);
        toast({
          title: "Test Failed",
          description: error.message || "Failed to run simple postcode test",
          variant: "destructive",
        });
        return;
      }
      
      console.log("📊 Test results:", data);
      setTestResult(data);
      
      if (data.success) {
        toast({
          title: "✅ Test Successful",
          description: "G11 5AW found on Airbnb!",
        });
      } else {
        toast({
          title: "❌ Test Failed",
          description: data.message,
          variant: "destructive",
        });
      }
      
    } catch (err) {
      console.error("❌ Error running test:", err);
      toast({
        title: "Error",
        description: "Failed to run simple postcode test",
        variant: "destructive",
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
            🎯 Simple G11 5AW Test
          </CardTitle>
          <CardDescription>
            Minimal test to verify G11 5AW can be found on Airbnb using ScrapingBee
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
                Testing G11 5AW...
              </>
            ) : (
              "🔍 Test G11 5AW on Airbnb"
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
              ) : (
                <XCircle className="h-5 w-5 text-red-500" />
              )}
              Test Results
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge variant={testResult.success ? "default" : "destructive"}>
                {testResult.success ? "SUCCESS" : "FAILED"}
              </Badge>
              <span className="text-sm text-gray-600">
                {testResult.responseTime}ms response time
              </span>
            </div>

            <div className="space-y-2">
              <p className="font-medium">{testResult.message}</p>
              <div className="text-sm text-gray-600">
                <div>Postcode: {testResult.postcode}</div>
                <div>HTML Length: {testResult.htmlLength} characters</div>
                <div>Search URL: <code className="text-xs bg-gray-100 px-1 rounded">{testResult.searchUrl}</code></div>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium">Detection Results:</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex items-center gap-2">
                  {testResult.checks.postcodeFound ? "✅" : "❌"}
                  Postcode Found
                </div>
                <div className="flex items-center gap-2">
                  {testResult.checks.listingsFound ? "✅" : "❌"}
                  Listings Found
                </div>
                <div className="flex items-center gap-2">
                  {testResult.checks.hasGlasgow ? "✅" : "❌"}
                  Glasgow Detected
                </div>
                <div className="flex items-center gap-2">
                  {testResult.checks.hasScotland ? "✅" : "❌"}
                  Scotland Detected
                </div>
                <div className="flex items-center gap-2">
                  {testResult.checks.hasG11 ? "✅" : "❌"}
                  G11 Found
                </div>
                <div className="flex items-center gap-2">
                  {testResult.checks.has5AW ? "✅" : "❌"}
                  5AW Found
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium">HTML Preview (first 500 chars):</h4>
              <div className="bg-gray-100 p-3 rounded text-xs font-mono overflow-x-auto">
                {testResult.htmlPreview}
              </div>
            </div>

            {testResult.error && (
              <div className="space-y-2">
                <h4 className="font-medium text-red-600">Error Details:</h4>
                <div className="bg-red-50 p-3 rounded text-sm text-red-700">
                  {testResult.error}
                  {testResult.details && (
                    <div className="mt-2 text-xs">{testResult.details}</div>
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
