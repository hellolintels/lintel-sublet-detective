
import React from 'react';
import { supabase } from '@/integrations/supabase/client';

const Dashboard = () => {
  const sendToNotifyAdmin = async (contactId: string) => {
    const { data, error } = await supabase.functions.invoke('notify-admin', {
      body: { contactId },
    });

    if (error) {
      console.error('Error calling notify-admin function:', error);
      alert('Failed to notify admin.');
      return;
    }

    console.log('Admin notified successfully:', data);
  };

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
      <p>Welcome to your dashboard. This area is under construction.</p>
    </div>
  );
};

export default Dashboard;
