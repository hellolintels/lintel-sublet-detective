
import React from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  "https://uejymkggevuvuerldzhv.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVlanlta2dnZXZ1dnVlcmxkemh2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYwOTg0MDUsImV4cCI6MjA2MTY3NDQwNX0.SooHrfGFnVZo4EjXwU5dVDydlKN4J7wCt7ImkRaGryU"
);

const Dashboard = () => {
  const sendToNotifyAdmin = async (contactId) => {
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
