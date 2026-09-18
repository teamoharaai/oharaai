import { createClient, navigatorLock, processLock, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const isDatabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

// Raise the auth-lock acquire timeout well above observed Supabase latency
// (measured at 2–6s for tasks/momentum). auth-js defaults this to ~5s, and when
// a network auth op (getUser / getSession / token refresh) holds the lock longer
// than that, the lock is *stolen* — two refreshes then run concurrently, refresh
// -token rotation invalidates the session, and the user is silently signed out
// (the "Lock … was not released within 5000ms" → "stolen" console cascade). 30s
// still recovers a genuinely hung lock.
const AUTH_LOCK_ACQUIRE_TIMEOUT_MS = 30_000;

// Custom lock so we can raise that timeout (supabase-js does not forward
// `lockAcquireTimeout`). SSR-safe: `navigatorLock` dereferences
// `navigator.locks`, which does not exist server-side (Layer 2 — this runs at
// call time inside API routes), so fall back to the in-process `processLock`
// there. In the browser we keep `navigatorLock` for cross-tab coordination.
function resilientAuthLock<R>(name: string, acquireTimeout: number, fn: () => Promise<R>): Promise<R> {
  if (typeof globalThis !== 'undefined' && globalThis.navigator?.locks) {
    return navigatorLock(name, AUTH_LOCK_ACQUIRE_TIMEOUT_MS, fn);
  }
  return processLock(name, acquireTimeout, fn);
}

export const supabase: SupabaseClient = isDatabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        // The auth callback explicitly exchanges PKCE codes so it can distinguish
        // account confirmation from password recovery. Automatic URL detection
        // would race that callback and try to consume the same one-time code.
        detectSessionInUrl: false,
        // auth-js defaults to 'implicit'; the callback is written for PKCE.
        flowType: 'pkce',
        lock: resilientAuthLock,
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
