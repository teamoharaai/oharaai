// Shared response shape for the versioned Goal routes (manual-v1, card-v1,
// work-v1). Kept dependency-free (no `@/` imports) so the strip-types test
// runner can load it; route files pass these into `withAuth`.

export const GOAL_ROUTE_CACHE_CONTROL = 'private, no-store';

// The Goal contract envelope for auth failures, instead of withAuth's plain
// `{ error: 'Unauthorized' }` body. 503 stays retryable and never signs out.
export const goalRouteAuthResponses = {
  onUnauthorized: () => Response.json({ ok: false, error: { code: 'UNAUTHORIZED' } }, { status: 401 }),
  onUnavailable: () => Response.json({ ok: false, error: { code: 'AUTH_UNAVAILABLE' } }, { status: 503, headers: { 'Retry-After': '2' } }),
};

// Every response, including auth failures produced before the handler runs, is
// user-specific: without this Vercel defaults to `public, max-age=0`.
export function privateNoStore(
  handler: (request: Request, params?: Record<string, string>) => Promise<Response>,
) {
  return async (request: Request, params: Record<string, string> = {}) => {
    const response = await handler(request, params);
    response.headers.set('Cache-Control', GOAL_ROUTE_CACHE_CONTROL);
    return response;
  };
}
