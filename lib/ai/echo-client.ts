import { callLLM } from './client';

const ECHO_REFLECTION_MODEL = 'claude-haiku-4-5-20251001';
const ECHO_REFLECTION_MAX_TOKENS = 500;
const ECHO_REFLECTION_TIMEOUT_MS = 15_000;

interface EchoReflectionParams {
  userId: string;
  accessToken: string;
  systemPrompt: string;
  userMessage: string;
}

interface EchoReflectionResult {
  text: string;
  inputTokens: number;
  outputTokens: number;
  model: string;
}

export async function callEchoReflection(
  params: EchoReflectionParams,
): Promise<EchoReflectionResult> {
  return callLLM({
    pipeline: 'echoReflect',
    userId: params.userId,
    accessToken: params.accessToken,
    systemPrompt: params.systemPrompt,
    userMessage: params.userMessage,
    model: ECHO_REFLECTION_MODEL,
    maxTokens: ECHO_REFLECTION_MAX_TOKENS,
    timeoutMs: ECHO_REFLECTION_TIMEOUT_MS,
  });
}
