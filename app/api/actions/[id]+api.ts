import { isDatabaseConfigured } from '@/lib/db/client';
import { withAuth, type AuthContext } from '@/lib/api/auth';

// ─── PATCH /api/actions/[id] ─────────────────────────────────────────────────
// Body: { status?, action_text? }
// If status = 'complete', completed_at is set to now()

export async function PATCH(
  request: Request,
  params: Record<string, string>,
): Promise<Response> {
  if (!isDatabaseConfigured) {
    return Response.json({ error: 'Database not configured' }, { status: 503 });
  }
  return withAuth(handlePatch)(request, params);
}

async function handlePatch(
  request: Request,
  params: Record<string, string>,
  auth: AuthContext,
): Promise<Response> {
  void request;
  void params;
  void auth;
  return Response.json(
    { error: 'Legacy action writes are disabled. Use canonical Tasks.' },
    { status: 410 },
  );
}
