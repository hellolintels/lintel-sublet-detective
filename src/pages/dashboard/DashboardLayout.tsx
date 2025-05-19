
import React from 'react';
import AdminNotifier from './AdminNotifier';
import BrightDataTester from './BrightDataTester';

const DashboardLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-black text-white p-8">
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <AdminNotifier />
        <BrightDataTester />
      </div>
    </div>
  );
};

export default DashboardLayout;
