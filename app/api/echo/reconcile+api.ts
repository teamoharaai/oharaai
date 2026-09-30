import { createAuthedClient } from '@/lib/db/client';
import { withAuth, type AuthContext } from '@/lib/api/auth';
import { callEchoReflection } from '@/lib/ai/echo-client';
import { buildEchoReflectionPrompt } from '@/lib/ai/prompts/echo-reflection';
import { ECHO_INFERENCE_PROMPT } from '@/lib/ai/echo/prompts';
import { AI_CONFIG } from '@/lib/ai/config';
import type { EchoEmotion, EchoBrt } from '@/features/echo/types';

// --- Reflection parser (mirrors reflect+api.ts — must stay in sync if that changes) ---

type ParsedReflection = {
  reflection: string | null;
  emotion: EchoEmotion | null;
  brt: EchoBrt | null;
  confidence: number | null;
  summarized: boolean;
};

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function parseReflection(rawText: string): ParsedReflection {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    return { reflection: rawText, emotion: null, brt: null, confidence: null, summarized: false };
  }

  if (typeof parsed !== 'object' || parsed === null) {
    return { reflection: rawText, emotion: null, brt: null, confidence: null, summarized: false };
  }

  const obj = parsed as Record<string, unknown>;

  if (typeof obj['reflection'] !== 'string') {
    return { reflection: rawText, emotion: null, brt: null, confidence: null, summarized: false };
  }

  const reflection = obj['reflection'];

  let emotion: EchoEmotion | null = null;
  const rawEmotion = obj['emotion'];
  if (rawEmotion !== null && typeof rawEmotion === 'object' && !Array.isArray(rawEmotion)) {
    const e = rawEmotion as Record<string, unknown>;
    if (
      typeof e['primary'] === 'string' &&
      typeof e['valence'] === 'number' &&
      (e['energy'] === 'low' || e['energy'] === 'medium' || e['energy'] === 'high') &&
      (e['clarity'] === 'low' || e['clarity'] === 'high')
    ) {
      emotion = {
        primary: e['primary'],
        valence: e['valence'],
        energy: e['energy'],
        clarity: e['clarity'],
      };
    }
  }

  let brt: EchoBrt | null = null;
  const rawBrt = obj['brt'];
  if (rawBrt !== null && typeof rawBrt === 'object' && !Array.isArray(rawBrt)) {
    const b = rawBrt as Record<string, unknown>;
    if (isStringArray(b['bud']) && isStringArray(b['rose']) && isStringArray(b['thorn'])) {
      brt = { bud: b['bud'], rose: b['rose'], thorn: b['thorn'] };
    }
  }

  const confidence = typeof obj['confidence'] === 'number' ? obj['confidence'] : null;

  return { reflection, emotion, brt, confidence, summarized: true };
}

// --- Route handler ---

type ReconcileResult = { reconciled: number; failed?: number };
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function requestedEntryIds(request: Request): Promise<string[] | null> {
  const raw = await request.json().catch(() => null) as { entryIds?: unknown } | null;
  if (!raw || raw.entryIds === undefined) return null;
  if (!Array.isArray(raw.entryIds) || raw.entryIds.length < 1 || raw.entryIds.length > 3
    || !raw.entryIds.every((entryId) => typeof entryId === 'string' && UUID_PATTERN.test(entryId))) {
    throw new Error('entryIds must be an array of one to three UUIDs');
  }
  return [...new Set(raw.entryIds as string[])];
}

export async function POST(request: Request): Promise<Response> {
  return withAuth(handlePost)(request);
}

async function handlePost(
  request: Request,
  _params: Record<string, string>,
  auth: AuthContext,
): Promise<Response> {
  try {
    const authedDb = createAuthedClient(auth.accessToken);
    const entryIds = await requestedEntryIds(request);
    const leaseToken = crypto.randomUUID();
    const { data: entries, error: claimError } = await authedDb.rpc(
      'claim_echo_reconciliation_v1',
      {
        p_entry_ids: entryIds,
        p_limit: entryIds ? entryIds.length : 3,
        p_lease_token: leaseToken,
        p_lease_seconds: 300,
      },
    );

    if (claimError) throw claimError;

    if (!entries || entries.length === 0) {
      return Response.json({ reconciled: 0 } satisfies ReconcileResult);
    }

    let reconciled = 0;
    let failed = 0;

    for (const entry of entries as Array<{ id: string; content: string; retry_count: number }>) {
      try {
        const llmResult = await callEchoReflection({
          userId: auth.userId,
          accessToken: auth.accessToken,
          systemPrompt: ECHO_INFERENCE_PROMPT,
          userMessage: buildEchoReflectionPrompt(entry.content),
        });

        const parsed = parseReflection(llmResult.text);

        if (!parsed.summarized) {
          await authedDb
            .from('echo_entries')
            .update({
              ai_status: 'failed',
              retry_count: entry.retry_count + 1,
              reconcile_lease_token: null,
              reconcile_lease_expires_at: null,
            })
            .eq('id', entry.id)
            .eq('reconcile_lease_token', leaseToken);
          failed++;
          continue;
        }

        const { error: updateError } = await authedDb
          .from('echo_entries')
          .update({
            ai_response: parsed.reflection,
            emotion: parsed.emotion,
            brt: parsed.brt,
            brt_ai: parsed.brt,
            confidence: parsed.confidence,
            model_version: AI_CONFIG.models.default,
            processed_at: new Date().toISOString(),
            summarized: true,
            ai_status: 'completed',
            reconcile_lease_token: null,
            reconcile_lease_expires_at: null,
          })
          .eq('id', entry.id)
          .eq('reconcile_lease_token', leaseToken);

        if (updateError) {
          console.error(
            `[echo/reconcile] DB update failed for entry ${entry.id}:`,
            updateError.message,
          );
          await authedDb
            .from('echo_entries')
            .update({
              ai_status: 'failed',
              retry_count: entry.retry_count + 1,
              reconcile_lease_token: null,
              reconcile_lease_expires_at: null,
            })
            .eq('id', entry.id)
            .eq('reconcile_lease_token', leaseToken);
          failed++;
        } else {
          reconciled++;
        }
      } catch (err) {
        console.error(
          `[echo/reconcile] Summarization failed for entry ${entry.id}:`,
          err instanceof Error ? err.message : String(err),
        );
        await authedDb
          .from('echo_entries')
          .update({
            ai_status: 'failed',
            retry_count: entry.retry_count + 1,
            reconcile_lease_token: null,
            reconcile_lease_expires_at: null,
          })
          .eq('id', entry.id)
          .eq('reconcile_lease_token', leaseToken);
        failed++;
      }
    }

    // Update last_summarized_at regardless of individual failures — we ran the batch.
    const { error: profileError } = await authedDb
      .from('profiles')
      .update({ last_summarized_at: new Date().toISOString() })
      .eq('id', auth.userId);

    if (profileError) {
      console.error('[echo/reconcile] Failed to update last_summarized_at:', profileError.message);
    }

    return Response.json({ reconciled, failed } satisfies ReconcileResult);
  } catch (err) {
    console.error(
      '[echo/reconcile] Route error:',
      err instanceof Error ? err.message : String(err),
    );
    return Response.json({ error: 'Reconciliation failed' }, { status: 500 });
  }
}
