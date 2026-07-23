import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const isDatabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase: SupabaseClient = isDatabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        // PKCE is the flow the auth callback (app/(auth)/callback.tsx) is written
        // for (exchangeCodeForSession) and the recommended flow for the upcoming
        // OAuth work. auth-js defaults to 'implicit', so this must be explicit.
        flowType: 'pkce',
      },
    })
  : (null as any);

export function createAuthedClient(accessToken: string): SupabaseClient {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });
}

if (!isDatabaseConfigured && process.env.NODE_ENV !== 'production') {
  console.warn('[Ohara] Supabase env vars not found — db calls will fail');
}

export default supabase;
