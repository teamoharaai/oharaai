import { callLLM } from '../client';
import { REFLECT_SYSTEM_PROMPT } from '../prompts/reflect';

export async function runReflectPipeline(
  userMessage: string,
  auth: { userId: string; accessToken: string },
) {
  return callLLM({
    pipeline: 'echoReflect',
    userId: auth.userId,
    accessToken: auth.accessToken,
    systemPrompt: REFLECT_SYSTEM_PROMPT,
    userMessage,
  });
}
