import supabase, { isDatabaseConfigured } from '@/lib/db/client';

export async function GET(request: Request): Promise<Response> {
  if (!isDatabaseConfigured) {
    return Response.json({ error: 'Database not configured' }, { status: 503 });
  }

  const authHeader = request.headers.get('Authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser(token);

  if (authError || !user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const [goalsResult, echoResult] = await Promise.all([
    supabase.from('goals').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
    supabase
      .from('echo_entries')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id),
  ]);

  return Response.json({
    goalCount: goalsResult.count ?? 0,
    echoCount: echoResult.count ?? 0,
  });
}
