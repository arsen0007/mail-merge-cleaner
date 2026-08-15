import { createClient } from '@supabase/supabase-js';

// Bypasses Row Level Security entirely via the service-role key.
// Import this ONLY in app/api/**/route.js files — never in any file
// that ships to the browser.
export function getSupabaseAdmin() {
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  );
}
