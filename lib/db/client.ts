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

// `fetch-nodeshim` (the fetch used inside Expo API routes server-side) defaults
// its per-request timeout to 5s. Supabase round-trips — especially auth
// validation (getUser) and token refresh — were measured at 2–6s, so they
// routinely EXCEEDED 5s and threw "Request timed out". A timed-out auth
// validation used to be misreported to the client as a 401 and silently signed
// the user out (see lib/api/auth.ts). Raise the server request timeout well
// above p99 by injecting nodeshim's `connectTimeout` option. The option is
// unknown to the browser's fetch and simply ignored there (Layer 1 — this
// wrapper runs in both runtimes), so it only changes the server path. Kept below
// AUTH_LOCK_ACQUIRE_TIMEOUT_MS so a hung request aborts before the lock steals.
const SERVER_FETCH_TIMEOUT_MS = 20_000;

const timeoutTolerantFetch = ((input: any, init?: any) =>
  globalThis.fetch(input, { ...init, connectTimeout: SERVER_FETCH_TIMEOUT_MS })) as typeof fetch;

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
      global: { fetch: timeoutTolerantFetch },
    })
  : (null as any);

export function createAuthedClient(accessToken: string): SupabaseClient {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      fetch: timeoutTolerantFetch,
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
