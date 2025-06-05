
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function TestApprovalFlow() {
  const [testResults, setTestResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const testContactId = "c132da22-35bd-46ea-af22-2b5441f5ada9";
  const projectRef = "uejymkggevuvuerldzhv";

  const addResult = (step: string, status: 'success' | 'error' | 'info', message: string, data?: any) => {
    const result = {
      step,
      status,
      message,
      data,
      timestamp: new Date().toISOString()
    };
    setTestResults(prev => [...prev, result]);
    console.log(`[${step}] ${status.toUpperCase()}: ${message}`, data);
  };

  const testStep1_ContactRetrieval = async () => {
    addResult("1", "info", "Testing contact retrieval from database...");
    
    try {
      // We'll test this by trying to get the contact via the approve-submission function
      // which internally calls getSubmission
      const testUrl = `https://${projectRef}.functions.supabase.co/approve-submission?action=approve&id=${testContactId}`;
      
      addResult("1", "info", `Testing URL: ${testUrl}`);
      
      const response = await fetch(testUrl, {
        method: 'GET',
        headers: {
          'Accept': 'text/html,application/json',
        }
      });
      
      const responseText = await response.text();
      
      if (response.ok) {
        addResult("1", "success", "Contact retrieval successful - approve-submission function found the contact");
        addResult("1", "info", "Response received", { status: response.status, preview: responseText.substring(0, 200) });
        return true;
      } else if (response.status === 404 && responseText.includes("Contact Not Found")) {
        addResult("1", "error", "BOTTLENECK FOUND: getSubmission function cannot find contact in database");
        addResult("1", "error", "This means the function is looking in wrong table or using wrong query");
        return false;
      } else if (response.status === 409 && responseText.includes("Already Processed")) {
        addResult("1", "info", "Contact exists but already processed - this is expected behavior");
        return true;
      } else {
        addResult("1", "error", `Unexpected response: ${response.status}`, { responseText });
        return false;
      }
    } catch (error) {
      addResult("1", "error", "Network error during contact retrieval test", { error: error.message });
      return false;
    }
  };

  const testStep2_ApprovalFlow = async () => {
    addResult("2", "info", "Testing full approval flow...");
    
    try {
      const approvalUrl = `https://${projectRef}.functions.supabase.co/approve-submission?action=approve&id=${testContactId}`;
      
      const response = await fetch(approvalUrl, {
        method: 'GET',
        headers: {
          'Accept': 'text/html,application/json',
        }
      });
      
      const responseText = await response.text();
      
      if (response.ok) {
        if (responseText.includes("Submission Approved Successfully")) {
          addResult("2", "success", "Full approval flow completed successfully");
          addResult("2", "info", "Railway processing should have been triggered");
        } else if (responseText.includes("Already Processed")) {
          addResult("2", "info", "Contact already processed - changing status to 'new' would allow re-testing");
        }
      } else {
        addResult("2", "error", `Approval flow failed: ${response.status}`, { responseText });
      }
    } catch (error) {
      addResult("2", "error", "Network error during approval flow test", { error: error.message });
    }
  };

  const testStep3_RailwayIntegration = async () => {
    addResult("3", "info", "Testing Railway integration...");
    
    try {
      const railwayUrl = `https://${projectRef}.functions.supabase.co/railway-trigger`;
      
      const response = await fetch(railwayUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contactId: testContactId
        })
      });
      
      const responseData = await response.json();
      
      if (response.ok) {
        addResult("3", "success", "Railway trigger function responded successfully");
        addResult("3", "info", "Railway integration working", responseData);
      } else {
        addResult("3", "error", `Railway trigger failed: ${response.status}`, responseData);
      }
    } catch (error) {
      addResult("3", "error", "Network error during Railway integration test", { error: error.message });
    }
  };

  const runFullTest = async () => {
    setIsLoading(true);
    setTestResults([]);
    
    addResult("START", "info", `Beginning Phase 1 testing with contact ID: ${testContactId}`);
    addResult("START", "info", "Contact: Jamie Thurs (jamie.noble.gla@gmail.com)");
    
    // Step 1: Test contact retrieval
    const step1Success = await testStep1_ContactRetrieval();
    
    // Step 2: Test approval flow (regardless of step 1 result)
    await testStep2_ApprovalFlow();
    
    // Step 3: Test Railway integration
    await testStep3_RailwayIntegration();
    
    addResult("COMPLETE", "info", "Phase 1 testing completed - check results above for bottlenecks");
    setIsLoading(false);
  };

  const clearResults = () => {
    setTestResults([]);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-black to-gray-900 text-white p-6">
      <div className="container mx-auto max-w-4xl">
        <Card className="bg-gray-900 border-gray-800 mb-6">
          <CardHeader>
            <CardTitle className="text-white text-2xl">🧪 Phase 1: Approval Flow Testing</CardTitle>
            <CardDescription className="text-gray-400">
              Testing the approval flow with existing contact ID to identify actual bottlenecks
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="bg-gray-800 p-4 rounded-lg">
                <h3 className="font-semibold mb-2">Test Subject:</h3>
                <p><strong>Contact ID:</strong> {testContactId}</p>
                <p><strong>Name:</strong> Jamie Thurs</p>
                <p><strong>Email:</strong> jamie.noble.gla@gmail.com</p>
                <p><strong>Status:</strong> new</p>
              </div>
              
              <div className="flex gap-4">
                <Button 
                  onClick={runFullTest} 
                  disabled={isLoading}
                  className="bg-[hsl(24,97%,40%)] hover:bg-[hsl(24,97%,35%)]"
                >
                  {isLoading ? "Testing..." : "🚀 Run Full Test"}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={clearResults}
                  disabled={isLoading}
                >
                  Clear Results
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {testResults.length > 0 && (
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white">Test Results</CardTitle>
              <CardDescription className="text-gray-400">
                Step-by-step results of the approval flow testing
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {testResults.map((result, index) => (
                  <div key={index} className="border border-gray-700 rounded-lg p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <Badge 
                        variant={result.status === 'success' ? 'default' : result.status === 'error' ? 'destructive' : 'secondary'}
                        className={result.status === 'success' ? 'bg-green-600' : ''}
                      >
                        {result.step}
                      </Badge>
                      <span className="text-sm text-gray-400">
                        {new Date(result.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-white mb-2">{result.message}</p>
                    {result.data && (
                      <pre className="bg-gray-800 p-2 rounded text-xs text-gray-300 overflow-x-auto">
                        {typeof result.data === 'string' ? result.data : JSON.stringify(result.data, null, 2)}
                      </pre>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
