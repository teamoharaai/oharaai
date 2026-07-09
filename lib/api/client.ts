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
  await supabase.auth.signOut({ scope: 'local' });
  router.replace('/(auth)/login');
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
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    await signOutAndRedirect();
    throw new UnauthorizedError();
  }

  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${session.access_token}`);

  const response = await fetch(path, { ...init, headers });

  if (response.status === 401) {
    await signOutAndRedirect();
    throw new UnauthorizedError();
  }

  return response;
}
