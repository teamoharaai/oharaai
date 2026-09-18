import supabase, { isDatabaseConfigured } from '../db/client.ts';

export interface AuthContext {
  userId: string;
  accessToken: string;
}

// Result of attempting to authenticate a request. We deliberately distinguish a
// genuine identity rejection (no token, or a token Supabase actively rejected)
// from a transient inability to VALIDATE the token (auth backend timeout /
// network error / 5xx). The distinction is load-bearing: the client signs the
// user out on a 401, so a slow-but-valid auth round-trip must NOT surface as
// 401 — otherwise a single Supabase timeout silently logs the user out and
// revokes their refresh token. Transient failures become 503 instead.
export type AuthResult =
  | { status: 'authed'; auth: AuthContext }
  | { status: 'unauthenticated' } // no token, or token genuinely rejected -> 401
  | { status: 'unavailable' }; // could not reach/validate the auth backend -> 503

// True when a getUser failure is transient infrastructure (timeout, network
// drop, 5xx) rather than a real auth rejection. auth-js wraps fetch failures —
// including the nodeshim "Request timed out" that previously produced spurious
// 401s — as AuthRetryableFetchError (name stable across versions; status 0 for a
// thrown/aborted fetch, or the upstream 5xx). A genuinely invalid/expired token
// is an AuthApiError with status 401/403 and is intentionally NOT transient.
function isTransientAuthError(error: unknown): boolean {
  const name = (error as { name?: string } | null)?.name;
  const status = (error as { status?: number } | null)?.status;
  return (
    name === 'AuthRetryableFetchError' ||
    status === 0 ||
    (typeof status === 'number' && status >= 500)
  );
}

export async function getAuthContext(request: Request): Promise<AuthResult> {
  const authHeader = request.headers.get('Authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token || !isDatabaseConfigured) return { status: 'unauthenticated' };

  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error) {
      return isTransientAuthError(error)
        ? { status: 'unavailable' }
        : { status: 'unauthenticated' };
    }
    return user
      ? { status: 'authed', auth: { userId: user.id, accessToken: token } }
      : { status: 'unauthenticated' };
  } catch {
    // getUser normally returns auth errors in `error`; a thrown exception here is
    // an unexpected infra failure, never an identity decision — treat it as
    // transient so it can't sign the user out.
    return { status: 'unavailable' };
  }
}

export type AuthedRouteHandler = (
  request: Request,
  params: Record<string, string>,
  auth: AuthContext,
) => Promise<Response>;

// Wraps an API route handler with the identity check every route needs before
// touching auth.userId/accessToken, so route files stop reimplementing
// getAuthContext locally. `params` defaults to {} for routes with no dynamic
// segments (e.g. index+api.ts handlers called as just `(request)`).
//
// Most routes return the plain `{ error: 'Unauthorized' }` 401 body, which is
// the default here. A few (e.g. intelligence/index+api.ts) are documented as
// returning the `AiResponse<T>` envelope instead — pass `onUnauthorized` to
// preserve that exact shape rather than changing a response contract as a
// side effect of removing duplication.
export function withAuth(
  handler: AuthedRouteHandler,
  options?: { onUnauthorized?: () => Response },
) {
  return async (request: Request, params: Record<string, string> = {}): Promise<Response> => {
    const result = await getAuthContext(request);
    if (result.status === 'authed') {
      return handler(request, params, result.auth);
    }
    if (result.status === 'unavailable') {
      // Transient: we could not validate the token (auth backend timeout / 5xx),
      // NOT a rejection of the user's identity. 503 tells the client to back off
      // and retry — it must never trigger the 401 sign-out path.
      return Response.json(
        { error: 'Auth temporarily unavailable' },
        { status: 503, headers: { 'Retry-After': '2' } },
      );
    }
    // Genuinely unauthenticated: no token, or Supabase rejected it.
    return options?.onUnauthorized
      ? options.onUnauthorized()
      : Response.json({ error: 'Unauthorized' }, { status: 401 });
  };
}
