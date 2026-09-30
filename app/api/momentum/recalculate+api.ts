import { withAuth, type AuthContext } from '@/lib/api/auth';
import { createAuthedClient, isDatabaseConfigured } from '@/lib/db/client';
import { createServiceRoleClient } from '@/lib/db/service-client';
import {
  publishCurrentMomentumV11Summary,
  recalculateMomentumV11Summary,
  getMomentumTaskParity,
  safeDiagnostic,
  safeGoalDiagnostic,
} from '@/features/momentum/services/momentum-service';
import { getMomentumWeek, normalizeTimezone } from '@/features/momentum/time';
import { FEATURES } from '@/constants/features';

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
  const readDb = createAuthedClient(auth.accessToken);
  const writeDb = createServiceRoleClient();
  const leaseToken = crypto.randomUUID();
  let weekStart: string | null = null;
  let claimed = false;

  try {
    const { data: profile, error: profileError } = await readDb.from('profiles')
      .select('timezone').eq('id', auth.userId).single();
    if (profileError) throw new Error(`Momentum timezone read failed: ${profileError.message}`);
    const timezone = normalizeTimezone((profile as { timezone?: string } | null)?.timezone);
    weekStart = getMomentumWeek(new Date(), timezone).weekStart;

    const { data: claimResult, error: claimError } = await writeDb.rpc(
      'claim_momentum_recalculation_v1',
      {
        p_user_id: auth.userId,
        p_week_start: weekStart,
        p_lease_token: leaseToken,
        p_lease_seconds: 180,
      },
    );
    if (claimError) throw new Error(`Momentum recalculation claim failed: ${claimError.message}`);
    claimed = claimResult === true;
    if (!claimed) {
      return Response.json({ accepted: true, deduplicated: true }, { status: 202 });
    }

    const result = await recalculateMomentumV11Summary(readDb, writeDb, auth.userId);
    await publishCurrentMomentumV11Summary(
      writeDb,
      auth.userId,
      result.summary,
      result.diagnostic.calculationHash,
    );
    const diagnosticsRequested = new URL(request.url).searchParams.get('diagnostics') === '1';
    const taskParity = diagnosticsRequested && FEATURES.TASKS_V2_COMPARE_LEGACY
      ? await getMomentumTaskParity(readDb, auth.userId)
      : null;
    return Response.json({
      accepted: true,
      deduplicated: false,
      data: result.summary,
      ...(diagnosticsRequested ? {
        diagnostic: safeDiagnostic(result.diagnostic),
        goalDiagnostics: result.goalDiagnostics.map(safeGoalDiagnostic),
        ...(taskParity ? { taskParity } : {}),
      } : {}),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Momentum recalculation failed';
    console.error('[momentum/recalculate] authoritative recalculation failed', {
      algorithmVersion: 'ohara-momentum-v1.1',
      error: message,
      userId: auth.userId,
      weekStart,
    });
    return Response.json({ error: 'Momentum recalculation is temporarily unavailable' }, { status: 500 });
  } finally {
    if (claimed && weekStart) {
      const { error } = await writeDb.rpc('release_momentum_recalculation_v1', {
        p_user_id: auth.userId,
        p_week_start: weekStart,
        p_lease_token: leaseToken,
      });
      if (error) console.error('[momentum/recalculate] lease release failed', { userId: auth.userId, weekStart });
    }
  }
}
