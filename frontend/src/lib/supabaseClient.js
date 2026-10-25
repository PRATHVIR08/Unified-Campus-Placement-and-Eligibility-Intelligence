import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;
const configured = Boolean(
  supabaseUrl &&
  supabaseKey &&
  /^https:\/\//i.test(supabaseUrl) &&
  !/your-project|placeholder/i.test(supabaseUrl) &&
  !/your-|placeholder/i.test(supabaseKey)
);

export const supabase = configured ? createClient(supabaseUrl, supabaseKey) : null;

export function requireSupabase() {
  if (!supabase) {
    throw new Error('Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in frontend/.env.');
  }
  return supabase;
}
