import { withAuth, type AuthContext } from '@/lib/api/auth';
import {
  iosError,
  iosJSON,
  iosRequestContext,
  logIosRouteFailure,
  type IosRequestContext,
} from '@/lib/api/ios-contract';
import { createAuthedClient, isDatabaseConfigured } from '@/lib/db/client';
import { createServiceRoleClient } from '@/lib/db/service-client';
import {
  getMomentumHomeSummary,
  safeDiagnostic,
  safeGoalDiagnostic,
} from '@/features/momentum/services/momentum-service';

export async function GET(request: Request): Promise<Response> {
  const context = iosRequestContext(request);
  if (!isDatabaseConfigured) {
    return iosError(context, 503, 'SERVICE_UNAVAILABLE', 'Service unavailable');
  }
  return withAuth(
    (innerRequest, params, auth) => handleGet(innerRequest, params, auth, context),
    { onUnauthorized: () => iosError(context, 401, 'UNAUTHORIZED', 'Unauthorized') },
  )(request);
}

async function handleGet(
  request: Request,
  _params: Record<string, string>,
  auth: AuthContext,
  context: IosRequestContext,
): Promise<Response> {
  try {
    const readDb = createAuthedClient(auth.accessToken);
    const writeDb = createServiceRoleClient();
    const result = await getMomentumHomeSummary(readDb, writeDb, auth.userId);
    const diagnosticsRequested = new URL(request.url).searchParams.get('diagnostics') === '1';
    return iosJSON(context, {
      data: {
        ...result.summary,
        ...(diagnosticsRequested ? {
          diagnostic: safeDiagnostic(result.diagnostic),
          goalDiagnostics: result.goalDiagnostics.map(safeGoalDiagnostic),
        } : {}),
      },
    });
  } catch (error) {
    logIosRouteFailure('momentum_read_failed', context, 500, error);
    return iosError(context, 500, 'INTERNAL_ERROR', 'Momentum is temporarily unavailable');
  }
}
