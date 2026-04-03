import { callLLM } from '../client';
import { REFLECT_SYSTEM_PROMPT } from '../prompts/reflect';

export async function runReflectPipeline(userMessage: string) {
  return callLLM({
    pipeline: 'echoReflect',
    systemPrompt: REFLECT_SYSTEM_PROMPT,
    userMessage,
  });
}
