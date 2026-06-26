import supabase, { createAuthedClient, isDatabaseConfigured } from '@/lib/db/client';
import { callEchoReflection } from '@/lib/ai/echo-client';
import { buildEchoReflectionPrompt } from '@/lib/ai/prompts/echo-reflection';
import { ECHO_INFERENCE_PROMPT } from '@/lib/ai/echo/prompts';
import { AI_CONFIG } from '@/lib/ai/config';
import type { EchoEmotion, EchoBrt } from '@/features/echo/types';

// --- Auth ---

async function getAuthContext(request: Request) {
  const authHeader = request.headers.get('Authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token || !isDatabaseConfigured) return null;

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  return error || !user ? null : { userId: user.id, accessToken: token };
}

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

export async function POST(request: Request): Promise<Response> {
  try {
    const auth = await getAuthContext(request);
    if (!auth) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const authedDb = createAuthedClient(auth.accessToken);

    // ai_status is the single gate. Two arms:
    //   1. not_requested/pending — first attempt, no retry cap.
    //   2. failed — retry eligible: fewer than 3 prior attempts AND cooldown
    //      of 10 minutes since last attempt (or never attempted).
    // summarized/ai_insight_requested are preserved elsewhere but no longer
    // used as filters here.
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { data: entries, error: fetchError } = await authedDb
      .from('echo_entries')
      .select('id, content, retry_count')
      .eq('user_id', auth.userId)
      .or(
        `ai_status.in.(not_requested,pending),and(ai_status.eq.failed,retry_count.lt.3,or(last_attempted_at.is.null,last_attempted_at.lt.${tenMinutesAgo}))`,
      );

    if (fetchError) throw fetchError;

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
          void authedDb
            .from('echo_entries')
            .update({
              ai_status: 'failed',
              retry_count: entry.retry_count + 1,
              last_attempted_at: new Date().toISOString(),
            })
            .eq('id', entry.id);
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
          })
          .eq('id', entry.id);

        if (updateError) {
          console.error(
            `[echo/reconcile] DB update failed for entry ${entry.id}:`,
            updateError.message,
          );
          void authedDb
            .from('echo_entries')
            .update({
              ai_status: 'failed',
              retry_count: entry.retry_count + 1,
              last_attempted_at: new Date().toISOString(),
            })
            .eq('id', entry.id);
          failed++;
        } else {
          reconciled++;
        }
      } catch (err) {
        console.error(
          `[echo/reconcile] Summarization failed for entry ${entry.id}:`,
          err instanceof Error ? err.message : String(err),
        );
        void authedDb
          .from('echo_entries')
          .update({
            ai_status: 'failed',
            retry_count: entry.retry_count + 1,
            last_attempted_at: new Date().toISOString(),
          })
          .eq('id', entry.id);
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
