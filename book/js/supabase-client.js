import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.110.8/+esm';

const { supabaseUrl, supabaseAnonKey } = window.BOOK_CONFIG;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

export async function rpc(name, args) {
  const { data, error } = await supabase.rpc(name, args);
  if (error) {
    const err = new Error(error.message || 'Request failed');
    err.code = error.code;
    err.details = error.details;
    throw err;
  }
  return data;
}
