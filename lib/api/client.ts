import { router } from 'expo-router';
import supabase from '@/lib/db/client';
import { useAuthStore } from '@/features/auth/store';
import { clearAllStores } from '@/store/clearAllStores';

// Thrown by authedFetch when the session is missing or the server rejects the
// access token. By the time this is thrown, handleSessionExpired has already
// redirected to login — callers only need to catch it to stop their own
// finally/error-state logic from fighting the navigation.
export class UnauthorizedError extends Error {
  constructor() {
    super('Unauthorized');
    this.name = 'UnauthorizedError';
  }
}

// Shared by authedFetch (on a 401) and any call site that signs the user out
// directly (e.g. a "Log out" menu item) — one implementation for the
// clear-state/sign-out/redirect sequence instead of each site reimplementing it.
export async function signOutAndRedirect(): Promise<void> {
  clearAllStores();
  useAuthStore.getState().setSession(null);
  // Global scope revokes the refresh token server-side (not just locally), so a
  // "Log out" actually ends the session everywhere rather than leaving a valid
  // refresh token behind on a shared/compromised device.
  await supabase.auth.signOut({ scope: 'global' });
  router.replace('/(auth)/login');
}

// Seconds of remaining validity below which we stop trusting the in-store token
// and go through supabase.auth.getSession() so auto-refresh can run. Generous
// enough that a screen firing several authedFetch calls at once never straddles
// the boundary mid-batch.
const TOKEN_REFRESH_SKEW_SECONDS = 60;

// Resolves the current access token WITHOUT touching the Supabase auth lock when
// possible. onAuthStateChange (app/_layout.tsx) keeps useAuthStore.session in
// sync with every refresh, so a still-valid token can be read synchronously.
// We only fall back to getSession() — which acquires the shared navigator lock
// and can trigger a network refresh — when the cached token is missing or within
// the refresh skew of expiry. This is what stops the "N hooks each getSession()
// on one screen" lock stampede that produced the gotrue "lock stolen" errors.
async function resolveAccessToken(): Promise<string | null> {
  const cached = useAuthStore.getState().session;
  if (cached?.access_token && cached.expires_at) {
    const secondsUntilExpiry = cached.expires_at - Math.floor(Date.now() / 1000);
    if (secondsUntilExpiry > TOKEN_REFRESH_SKEW_SECONDS) {
      return cached.access_token;
    }
  }
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

// Fetch wrapper for calling this app's own /api/* routes as the current user.
// Attaches the session's access token as a Bearer header and, on a 401 (no
// session, or the server rejected the token), clears local state and redirects
// to login — the same outcome onAuthStateChange already produces for
// refresh-token expiry, so both paths converge on one visible behavior instead
// of each call site inventing its own.
//
// Any other status (404, 500, ...) is returned as-is for the caller to
// interpret — this wrapper only owns the "is this request authenticated"
// concern, not feature-specific error handling.
export async function authedFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const accessToken = await resolveAccessToken();

  if (!accessToken) {
    await signOutAndRedirect();
    throw new UnauthorizedError();
  }

  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${accessToken}`);

  const response = await fetch(path, { ...init, headers });

  // ONLY a 401 signs the user out: the server returns 401 exclusively when the
  // token is genuinely rejected. A transient failure to VALIDATE the token (auth
  // backend timeout / 5xx) comes back as 503 (see lib/api/auth.ts withAuth) and
  // must be treated as retryable, NOT a dead session — it is returned as-is like
  // any other non-401 status so a slow auth round-trip never logs the user out.
  if (response.status === 401) {
    await signOutAndRedirect();
    throw new UnauthorizedError();
  }

  return response;
}
