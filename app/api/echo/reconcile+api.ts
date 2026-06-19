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

    // Sole predicate: summarized = false AND ai_insight_requested = true.
    // We do NOT filter by created_at > last_summarized_at — that would silently
    // skip failed entries that predate the last successful summarization run.
    const { data: entries, error: fetchError } = await authedDb
      .from('echo_entries')
      .select('id, content')
      .eq('user_id', auth.userId)
      .eq('summarized', false)
      .eq('ai_insight_requested', true);

    if (fetchError) throw fetchError;

    if (!entries || entries.length === 0) {
      return Response.json({ reconciled: 0 } satisfies ReconcileResult);
    }

    let reconciled = 0;
    let failed = 0;

    for (const entry of entries as Array<{ id: string; content: string }>) {
      try {
        const llmResult = await callEchoReflection({
          userId: auth.userId,
          accessToken: auth.accessToken,
          systemPrompt: ECHO_INFERENCE_PROMPT,
          userMessage: buildEchoReflectionPrompt(entry.content),
        });

        const parsed = parseReflection(llmResult.text);

        if (!parsed.summarized) {
          // LLM returned but the response didn't parse into a valid reflection
          failed++;
          continue;
        }

        const { error: updateError } = await authedDb
          .from('echo_entries')
          .update({
            ai_response: parsed.reflection,
            emotion: parsed.emotion,
            brt: parsed.brt,
            confidence: parsed.confidence,
            model_version: AI_CONFIG.models.default,
            processed_at: new Date().toISOString(),
            summarized: true,
          })
          .eq('id', entry.id);

        if (updateError) {
          console.error(
            `[echo/reconcile] DB update failed for entry ${entry.id}:`,
            updateError.message,
          );
          failed++;
        } else {
          reconciled++;
        }
      } catch (err) {
        console.error(
          `[echo/reconcile] Summarization failed for entry ${entry.id}:`,
          err instanceof Error ? err.message : String(err),
        );
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
