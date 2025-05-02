import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.REACT_APP_SUPABASE_ANON_KEY
);

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
