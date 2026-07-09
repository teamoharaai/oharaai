import supabase, { isDatabaseConfigured } from '@/lib/db/client';
import { withAuth, type AuthContext } from '@/lib/api/auth';

export async function GET(request: Request): Promise<Response> {
  if (!isDatabaseConfigured) {
    return Response.json({ error: 'Database not configured' }, { status: 503 });
  }
  return withAuth(handleGet)(request);
}

async function handleGet(_request: Request, _params: Record<string, string>, auth: AuthContext): Promise<Response> {
  const [goalsResult, echoResult] = await Promise.all([
    supabase.from('goals').select('id', { count: 'exact', head: true }).eq('user_id', auth.userId),
    supabase
      .from('echo_entries')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', auth.userId),
  ]);

  return Response.json({
    goalCount: goalsResult.count ?? 0,
    echoCount: echoResult.count ?? 0,
  });
}
