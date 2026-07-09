import { runIntelligencePipeline } from '@/lib/ai/pipelines/intelligence';
import { isAIRateLimitError } from '@/lib/ai/errors';
import type { AiResponse } from '@/lib/ai/contracts';
import { isProfileSufficient } from '@/lib/ai/isProfileSufficient';
import { FEATURES } from '@/constants/features';
import supabase from '@/lib/db/client';
import { withAuth, type AuthContext } from '@/lib/api/auth';

type IntelligenceData = {
  insight: string | null;
  sufficient: boolean;
};

function unauthorizedResponse(): Response {
  const errBody: AiResponse<never> = { ok: false, data: null, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } };
  return Response.json(errBody, { status: 401 });
}

/**
 * POST /api/intelligence
 *
 * Fetches the calling user's character_profile, checks sufficiency, and
 * generates a single-sentence observational insight if sufficient.
 *
 * Response shapes (all wrapped in AiResponse<IntelligenceData>):
 *   ok:true,  { insight: string, sufficient: true }  — profile sufficient, insight generated
 *   ok:true,  { insight: null,   sufficient: false } — profile not yet sufficient
 *   ok:true,  { insight: null,   sufficient: true }  — sufficient but generation failed (use fallback)
 *   ok:false, UNKNOWN_ERROR 503                      — feature flag off
 *   ok:false, UNAUTHORIZED  401                      — unauthenticated request
 *   ok:false, RATE_LIMITED  429                      — daily quota exhausted
 *
 * No request body required — user identity comes from the Authorization header.
 */
export async function POST(request: Request) {
  if (!FEATURES.INTELLIGENCE_ENABLED) {
    const errBody: AiResponse<never> = {
      ok: false,
      data: null,
      error: { code: 'FEATURE_DISABLED', message: 'Intelligence feature is not enabled.' },
    };
    return Response.json(errBody, { status: 503 });
  }
  return withAuth(handlePost, { onUnauthorized: unauthorizedResponse })(request);
}

async function handlePost(_request: Request, _params: Record<string, string>, auth: AuthContext): Promise<Response> {
  const { data, error: dbError } = await supabase
    .from('profiles')
    .select('character_profile')
    .eq('id', auth.userId)
    .single();

  if (dbError) {
    console.error('[intelligence] failed to fetch profile:', dbError.message);
    const body: AiResponse<IntelligenceData> = { ok: true, data: { insight: null, sufficient: false }, error: null };
    return Response.json(body);
  }

  const characterProfile =
    data && typeof data === 'object' && 'character_profile' in data
      ? (data as { character_profile: unknown }).character_profile
      : {};

  if (!isProfileSufficient(characterProfile)) {
    const body: AiResponse<IntelligenceData> = { ok: true, data: { insight: null, sufficient: false }, error: null };
    return Response.json(body);
  }

  try {
    const insight = await runIntelligencePipeline(characterProfile, auth);
    const body: AiResponse<IntelligenceData> = { ok: true, data: { insight, sufficient: true }, error: null };
    return Response.json(body);
  } catch (error) {
    if (isAIRateLimitError(error)) {
      const errBody: AiResponse<never> = { ok: false, data: null, error: { code: 'RATE_LIMITED', message: error.message } };
      return Response.json(errBody, { status: 429 });
    }

    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[intelligence] pipeline failed:', message);
    // Profile is sufficient but generation failed — return ok:true with null insight so
    // the dashboard falls back to the dormant state rather than showing an error.
    const body: AiResponse<IntelligenceData> = { ok: true, data: { insight: null, sufficient: true }, error: null };
    return Response.json(body);
  }
}
