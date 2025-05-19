
import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface TestResult {
  postcode: string;
  airbnb: {
    status: string;
    count?: number;
    url?: string;
  };
  spareroom: {
    status: string;
    count?: number;
    url?: string;
  };
  gumtree: {
    status: string;
    count?: number;
    url?: string;
  };
}

interface BrightDataTestResults {
  results?: TestResult[];
  connectionStatus?: 'success' | 'error';
  connectionError?: string;
}

const BrightDataTester = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [testResults, setTestResults] = useState<BrightDataTestResults | null>(null);
  const [testError, setTestError] = useState<string | null>(null);

  const testBrightDataConnection = async (testType: 'basic' | 'full' = 'basic') => {
    setIsLoading(true);
    setTestResults(null);
    setTestError(null);
    
    const postcodes = testType === 'basic' 
      ? ['G12 9HB', 'SW1A 1AA'] // Basic test with fewer postcodes
      : ['G12 9HB', 'SW1A 1AA', 'EH1 1BB', 'M1 1AE', 'CF10 1EP']; // Comprehensive test
    
    try {
      const { data, error } = await supabase.functions.invoke('process-addresses', {
        body: { 
          action: 'test_bright_data',
          postcodes: postcodes,
          testType
        }
      });

      if (error) {
        console.error('Error testing Bright Data connection:', error);
        setTestError(`Failed to test Bright Data connection: ${error.message}`);
        toast({
          title: "Error",
          description: "Failed to test Bright Data connection.",
          variant: "destructive",
        });
        return;
      }

      console.log('Bright Data test results:', data);
      setTestResults(data);
      toast({
        title: "Success",
        description: `Bright Data ${testType} test completed successfully.`,
      });
    } catch (err) {
      console.error('Error in Bright Data test process:', err);
      setTestError(`An unexpected error occurred: ${err instanceof Error ? err.message : String(err)}`);
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const renderTestResults = () => {
    if (!testResults) return null;
    
    return (
      <div className="mt-4 space-y-4">
        <h3 className="text-lg font-medium text-white">Test Results</h3>
        
        {testResults.results?.map((result: TestResult, index: number) => (
          <div key={index} className="rounded-md bg-gray-800 p-4">
            <h4 className="font-medium text-white mb-2">Postcode: {result.postcode}</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {['airbnb', 'spareroom', 'gumtree'].map((platform) => (
                <div key={platform} className="p-3 rounded-md bg-gray-700">
                  <h5 className="font-medium capitalize text-white">{platform}</h5>
                  <p className="text-sm text-gray-300">
                    Status: <span className={`font-medium ${
                      result[platform as keyof TestResult].status === 'investigate' 
                        ? 'text-yellow-400' 
                        : result[platform as keyof TestResult].status === 'no match' 
                          ? 'text-gray-400' 
                          : 'text-red-400'
                    }`}>
                      {result[platform as keyof TestResult].status}
                    </span>
                  </p>
                  {result[platform as keyof TestResult].count !== undefined && (
                    <p className="text-sm text-gray-300">
                      Matching listings: {result[platform as keyof TestResult].count}
                    </p>
                  )}
                  {result[platform as keyof TestResult].url && (
                    <a 
                      href={result[platform as keyof TestResult].url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-xs text-blue-400 hover:underline mt-1 block truncate"
                    >
                      View search results
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}

        {testResults.connectionStatus && (
          <Alert className={`mt-4 ${
            testResults.connectionStatus === 'success' 
              ? 'bg-green-900 border-green-700' 
              : 'bg-red-900 border-red-700'
          }`}>
            <AlertTitle className="text-white">API Connection Status</AlertTitle>
            <AlertDescription className="text-gray-300">
              {testResults.connectionStatus === 'success' 
                ? 'Successfully connected to Bright Data API' 
                : `Connection failed: ${testResults.connectionError || 'Unknown error'}`}
            </AlertDescription>
          </Alert>
        )}
      </div>
    );
  };

  return (
    <Card className="bg-gray-900 border-gray-800">
      <CardHeader>
        <CardTitle className="text-white">Bright Data Integration</CardTitle>
        <CardDescription className="text-gray-400">
          Test and monitor scraping functionality
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-3">
          <Button 
            variant="default" 
            onClick={() => testBrightDataConnection('basic')}
            disabled={isLoading}
            className="w-full bg-orange-600 hover:bg-orange-700"
          >
            {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Testing...</> : 'Quick Connection Test'}
          </Button>
          
          <Button 
            variant="outline" 
            onClick={() => testBrightDataConnection('full')}
            disabled={isLoading}
            className="w-full border-orange-600 text-orange-500 hover:bg-orange-900/20"
          >
            {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Testing...</> : 'Comprehensive Test (Multiple Postcodes)'}
          </Button>
        </div>
        
        <p className="text-sm text-gray-400">
          Tests the connection to Bright Data by scraping sample postcodes across multiple platforms.
        </p>
        
        {testError && (
          <Alert variant="destructive">
            <AlertTitle>Test Failed</AlertTitle>
            <AlertDescription>{testError}</AlertDescription>
          </Alert>
        )}
        
        {renderTestResults()}
      </CardContent>
    </Card>
  );
};

export default BrightDataTester;
