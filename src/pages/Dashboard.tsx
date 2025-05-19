
import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const Dashboard = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [testResults, setTestResults] = useState<any>(null);
  const [testError, setTestError] = useState<string | null>(null);

  const sendToNotifyAdmin = async (contactId: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('notify-admin', {
        body: { contactId },
      });

      if (error) {
        console.error('Error calling notify-admin function:', error);
        toast({
          title: "Error",
          description: "Failed to notify admin.",
          variant: "destructive",
        });
        return;
      }

      console.log('Admin notified successfully:', data);
      toast({
        title: "Success",
        description: "Admin notification sent successfully.",
      });
    } catch (err) {
      console.error('Error in notify-admin process:', err);
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

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
        
        {testResults.results?.map((result: any, index: number) => (
          <div key={index} className="rounded-md bg-gray-800 p-4">
            <h4 className="font-medium text-white mb-2">Postcode: {result.postcode}</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {['airbnb', 'spareroom', 'gumtree'].map((platform) => (
                <div key={platform} className="p-3 rounded-md bg-gray-700">
                  <h5 className="font-medium capitalize text-white">{platform}</h5>
                  <p className="text-sm text-gray-300">
                    Status: <span className={`font-medium ${result[platform].status === 'investigate' ? 'text-yellow-400' : result[platform].status === 'no match' ? 'text-gray-400' : 'text-red-400'}`}>
                      {result[platform].status}
                    </span>
                  </p>
                  {result[platform].count !== undefined && (
                    <p className="text-sm text-gray-300">Matching listings: {result[platform].count}</p>
                  )}
                  {result[platform].url && (
                    <a 
                      href={result[platform].url} 
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
          <Alert className={`mt-4 ${testResults.connectionStatus === 'success' ? 'bg-green-900 border-green-700' : 'bg-red-900 border-red-700'}`}>
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
    <div className="min-h-screen bg-black text-white p-8">
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">Platform Administration</CardTitle>
            <CardDescription className="text-gray-400">
              Manage system notifications and actions
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              variant="default" 
              onClick={() => sendToNotifyAdmin('test-contact-id')}
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              {isLoading ? 'Sending...' : 'Send Admin Notification'}
            </Button>
          </CardContent>
        </Card>

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
      </div>
    </div>
  );
};

export default Dashboard;
