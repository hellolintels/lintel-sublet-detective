
import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const AdminNotifier = () => {
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

  return (
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
  );
};

export default AdminNotifier;
