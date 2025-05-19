
import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const Dashboard = () => {
  const [isLoading, setIsLoading] = useState(false);

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

  const testBrightDataConnection = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('process-addresses', {
        body: { 
          action: 'test_bright_data',
          postcodes: ['G12 9HB', 'SW1A 1AA', 'EH1 1BB']
        }
      });

      if (error) {
        console.error('Error testing Bright Data connection:', error);
        toast({
          title: "Error",
          description: "Failed to test Bright Data connection.",
          variant: "destructive",
        });
        return;
      }

      console.log('Bright Data test results:', data);
      toast({
        title: "Success",
        description: "Bright Data test completed successfully.",
      });
    } catch (err) {
      console.error('Error in Bright Data test process:', err);
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
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
            <Button 
              variant="default" 
              onClick={testBrightDataConnection}
              disabled={isLoading}
              className="w-full bg-orange-600 hover:bg-orange-700"
            >
              {isLoading ? 'Testing...' : 'Test Bright Data Connection'}
            </Button>
            <p className="text-sm text-gray-400">
              Tests the connection to Bright Data by scraping a few sample postcodes.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
