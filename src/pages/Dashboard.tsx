const handleSubmit = async () => {
  // Save contact info in Supabase table
  const { data: contact, error } = await supabase
    .from('contacts')
    .insert([{ full_name, email, phone, company, file_name }])
    .single();

  if (error) {
    console.error('Error inserting contact:', error);
    alert('Failed to save contact.');
    return;
  }

  // Upload the CSV file to Supabase Storage
  const { error: uploadError } = await supabase
    .storage
    .from('address-lists')
    .upload(file_name, file);

  if (uploadError) {
    console.error('Error uploading file:', uploadError);
    alert('Failed to upload file.');
    return;
  }

  // Call the new notify-admin function
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
