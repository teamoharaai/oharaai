import { callLLM } from '../client';
import {
  INTELLIGENCE_SYSTEM_PROMPT,
  buildIntelligencePrompt,
} from '../prompts/intelligence';

/**
 * Generates a single observational intelligence insight from the user's
 * character profile JSONB. Returns a plain string, max 120 chars.
 *
 * Throws if the LLM call fails or returns empty output — callers are
 * responsible for graceful fallback.
 */
export async function runIntelligencePipeline(
  characterProfile: unknown,
  auth: { userId: string; accessToken: string },
): Promise<string> {
  const result = await callLLM({
    pipeline: 'intelligence',
    userId: auth.userId,
    accessToken: auth.accessToken,
    systemPrompt: INTELLIGENCE_SYSTEM_PROMPT,
    userMessage: buildIntelligencePrompt(characterProfile),
  });

  const insight = result.text.trim().slice(0, 120);

  if (!insight) {
    throw new Error('Intelligence pipeline returned empty output.');
  }

  return insight;
}
