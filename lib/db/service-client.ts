import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';

// Server-only. Never import from client-bundled code — SUPABASE_SERVICE_ROLE_KEY must
// not ship to the browser. Throws (Layer 2 — called from route handlers, not module
// init) if the key isn't configured, rather than silently falling back.
export function createServiceRoleClient(): SupabaseClient {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY (or Supabase URL) is not configured');
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
