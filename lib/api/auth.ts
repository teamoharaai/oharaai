import supabase, { isDatabaseConfigured } from '@/lib/db/client';

export interface AuthContext {
  userId: string;
  accessToken: string;
}

export async function getAuthContext(request: Request): Promise<AuthContext | null> {
  const authHeader = request.headers.get('Authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token || !isDatabaseConfigured) return null;

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  return error || !user ? null : { userId: user.id, accessToken: token };
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
    const auth = await getAuthContext(request);
    if (!auth) {
      return options?.onUnauthorized
        ? options.onUnauthorized()
        : Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return handler(request, params, auth);
  };
}
