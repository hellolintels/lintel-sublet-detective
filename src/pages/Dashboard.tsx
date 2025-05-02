import { createClient } from '@supabase/supabase-js';
import React, { useState } from 'react';

// Initialize Supabase client
const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.REACT_APP_SUPABASE_ANON_KEY
);

const Dashboard = () => {
  const [full_name, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');
  const [file, setFile] = useState(null);
  const [file_name, setFileName] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!file) {
      alert('Please upload a file.');
      return;
    }

    // Insert contact into Supabase table
    const { data: contact, error } = await supabase
      .from('contacts')
      .insert([{ full_name, email, phone, company, file_name }])
      .single();

    if (error) {
      console.error('Error inserting contact:', error);
      alert('Failed to save contact.');
      return;
    }

    // Upload CSV file to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('address-lists')
      .upload(file_name, file);

    if (uploadError) {
      console.error('Error uploading file:', uploadError);
      alert('Failed to upload file.');
      return;
    }

    // Call the notify-admin Edge Function
    const { error: fnError } = await supabase.functions.invoke('notify-admin', {
      body: { contactId: contact.id },
    });

    if (fnError) {
      console.error('Error sending admin email:', fnError);
      alert('Failed to send admin notification.');
      return;
    }

    alert('Form submitted and email sent to admin!');
  };

  return (
    <form onSubmit={handleSubmit}>
      <input type="text" placeholder="Full Name" onChange={(e) => setFullName(e.target.value)} required />
      <input type="email" placeholder="Email" onChange={(e) => setEmail(e.target.value)} required />
      <input type="text" placeholder="Phone" onChange={(e) => setPhone(e.target.value)} required />
      <input type="text" placeholder="Company" onChange={(e) => setCompany(e.target.value)} required />
      <input type="file" onChange={(e) => { setFile(e.target.files[0]); setFileName(e.target.files[0].name); }} required />
      <button type="submit">Submit</button>
    </form>
  );
};

export default Dashboard;
