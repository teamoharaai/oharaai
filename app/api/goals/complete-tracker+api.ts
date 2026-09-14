import { withAuth, type AuthContext } from '@/lib/api/auth';
import { isDatabaseConfigured } from '@/lib/db/client';

export async function POST(request: Request): Promise<Response> {
  if (!isDatabaseConfigured) {
    return Response.json({ error: 'Database not configured' }, { status: 503 });
  }
  return withAuth(handlePost)(request);
}

async function handlePost(
  request: Request,
  _params: Record<string, string>,
  auth: AuthContext,
): Promise<Response> {
  void request;
  void auth;
  return Response.json(
    { error: 'Legacy Tracker writes are disabled. Use canonical Tasks.' },
    { status: 410 },
  );
}
