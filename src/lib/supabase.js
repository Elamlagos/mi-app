import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || '';
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY || '';

let client;

if (supabaseUrl && supabaseKey) {
  client = createClient(supabaseUrl, supabaseKey);
} else {
  // Avoid runtime errors in environments without env vars (e.g. tests)
  console.warn('Supabase credentials missing. Using placeholder client.');
  client = createClient('https://example.supabase.co', 'public-anon-key');
}

export const supabase = client;
