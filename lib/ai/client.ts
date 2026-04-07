import { createClient } from '@supabase/supabase-js';
import { AI_CONFIG } from './config';
import { AIRateLimitError } from './errors';
import type { AiErrorCode } from './contracts';

type ConversationMessage = { role: 'user' | 'assistant'; content: string };

const DAILY_AI_LIMIT = 30;
const DEFAULT_REQUEST_TIMEOUT_MS = 30_000;

export interface CallLLMParams {
  pipeline: keyof typeof AI_CONFIG.pipelines;
  userId: string;
  accessToken: string;
  systemPrompt: string;
  /** Single-turn: provide userMessage. Multi-turn: provide messages array. */
  userMessage?: string;
  messages?: ConversationMessage[];
  assistantPrefill?: string;
  model?: string;
  maxTokens?: number;
  stopSequences?: string[];
  timeoutMs?: number;
}

export interface CallLLMResult {
  text: string;
  inputTokens: number;
  outputTokens: number;
  model: string;
}

interface AnthropicMessageResponse {
  content?: Array<{ type?: string; text?: string }>;
  error?: { message?: string; type?: string };
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
  };
}

function resolveModel(modelKeyOrId?: string) {
  if (!modelKeyOrId) {
    return AI_CONFIG.models.default;
  }

  return AI_CONFIG.models[modelKeyOrId as keyof typeof AI_CONFIG.models] ?? modelKeyOrId;
}

function resolveMaxTokens(pipeline: keyof typeof AI_CONFIG.maxTokens, maxTokens?: number) {
  if (typeof maxTokens === 'number') {
    return maxTokens;
  }

  return AI_CONFIG.maxTokens[pipeline];
}

function getAnthropicApiKey() {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    throw new Error('Anthropic API key missing. Set ANTHROPIC_API_KEY in your local environment.');
  }

  return apiKey;
}

function getSupabaseConfig() {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
  const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

  if (!url || !anonKey) {
    throw new Error('Supabase env missing. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.');
  }

  return { url, anonKey };
}

function createAuthedSupabaseClient(accessToken: string) {
  const { url, anonKey } = getSupabaseConfig();

  return createClient(url, anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });
}

async function consumeDailyQuota(userId: string, accessToken: string) {
  if (!userId.trim()) {
    throw new Error('Authenticated user required for AI calls.');
  }

  if (!accessToken.trim()) {
    throw new Error('Authenticated AI access token missing.');
  }

  const usageDate = new Date().toISOString().slice(0, 10);
  const supabase = createAuthedSupabaseClient(accessToken);
  const { data, error } = await supabase.rpc('consume_daily_ai_quota', {
    p_date: usageDate,
    p_limit: DAILY_AI_LIMIT,
  });

  if (error) {
    throw new Error(error.message);
  }

  const row = Array.isArray(data) ? data[0] : null;
  if (!row || typeof row.allowed !== 'boolean' || typeof row.count !== 'number') {
    throw new Error('Daily AI quota RPC returned an invalid payload.');
  }

  if (!row.allowed) {
    throw new AIRateLimitError();
  }
}

function classifyError(err: unknown): AiErrorCode {
  if (err != null && typeof err === 'object' && 'code' in err) {
    return (err as { code: AiErrorCode }).code;
  }
  return 'AI_PROVIDER_ERROR';
}

interface ObservabilityEvent {
  event: 'ai_call';
  pipeline: string;
  model: string;
  latency_ms: number;
  input_tokens: number;
  output_tokens: number;
  error_code: AiErrorCode | null;
  user_id: string;
  timestamp: string;
}

function emitObservabilityLog(event: ObservabilityEvent): void {
  console.log(JSON.stringify(event));
}

export async function callLLM(params: CallLLMParams): Promise<CallLLMResult> {
  const pipelineConfig = AI_CONFIG.pipelines[params.pipeline];

  if (!pipelineConfig.enabled) {
    throw new Error(`AI pipeline "${params.pipeline}" is disabled in lib/ai/config.ts`);
  }

  const resolvedModel = resolveModel(params.model ?? pipelineConfig.model);
  const requestMessages = params.messages ?? [{ role: 'user' as const, content: params.userMessage ?? '' }];
  const messages = params.assistantPrefill
    ? [...requestMessages, { role: 'assistant' as const, content: params.assistantPrefill }]
    : requestMessages;
  const controller = new AbortController();
  const timeoutMs = params.timeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS;
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  await consumeDailyQuota(params.userId, params.accessToken);

  const callStart = Date.now();
  let responseUsage = { input_tokens: 0, output_tokens: 0 };

  try {
    let response: Response;
    try {
      response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
          'x-api-key': getAnthropicApiKey(),
        },
        body: JSON.stringify({
          model: resolvedModel,
          max_tokens: resolveMaxTokens(params.pipeline, params.maxTokens),
          system: params.systemPrompt,
          messages,
          stop_sequences: params.stopSequences,
        }),
        signal: controller.signal,
      });
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Anthropic request timed out after ${timeoutMs}ms`);
      }

      throw error;
    } finally {
      clearTimeout(timeoutId);
    }

    const data = (await response.json()) as AnthropicMessageResponse;

    responseUsage = {
      input_tokens: data.usage?.input_tokens ?? 0,
      output_tokens: data.usage?.output_tokens ?? 0,
    };

    if (!response.ok) {
      const message = data.error?.message ?? `Anthropic request failed with status ${response.status}`;
      throw new Error(message);
    }

    const continuation = (data.content ?? [])
      .filter((block) => block.type === 'text' && typeof block.text === 'string')
      .map((block) => block.text)
      .join('\n')
      .trim();

    if (!continuation) {
      throw new Error('Anthropic returned no text content.');
    }

    const text = params.assistantPrefill
      ? `${params.assistantPrefill}${continuation}`
      : continuation;

    const result: CallLLMResult = {
      text,
      inputTokens: responseUsage.input_tokens,
      outputTokens: responseUsage.output_tokens,
      model: resolvedModel,
    };

    emitObservabilityLog({
      event: 'ai_call',
      pipeline: params.pipeline,
      model: resolvedModel,
      latency_ms: Date.now() - callStart,
      input_tokens: responseUsage.input_tokens,
      output_tokens: responseUsage.output_tokens,
      error_code: null,
      user_id: params.userId,
      timestamp: new Date().toISOString(),
    });

    return result;
  } catch (err) {
    emitObservabilityLog({
      event: 'ai_call',
      pipeline: params.pipeline,
      model: resolvedModel,
      latency_ms: Date.now() - callStart,
      input_tokens: responseUsage.input_tokens,
      output_tokens: responseUsage.output_tokens,
      error_code: classifyError(err),
      user_id: params.userId,
      timestamp: new Date().toISOString(),
    });

    throw err;
  }
}
