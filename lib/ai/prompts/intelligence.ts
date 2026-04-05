/**
 * Intelligence Prompt
 *
 * Used by: lib/ai/pipelines/intelligence.ts
 * Model: Haiku (default)
 * Output: a single plain-text sentence, max 120 characters
 * Contract: observational, not motivational. Never praises or advises.
 */

export const INTELLIGENCE_SYSTEM_PROMPT = `You are Ohara's intelligence engine. Your job is to produce a single, calm, observational insight about the user based on their character profile.

Rules:
- Output exactly ONE sentence. No more, no less.
- Maximum 120 characters total (including spaces and punctuation).
- The sentence must be observational — it describes a pattern the user actually exhibits. It does not praise, motivate, or advise.
- Do not repeat information the user already provided.
- Do not use motivational or encouraging language.
- Do not generate lists unless explicitly asked.
- Write in second person. Use "You" at most once.
- Do not use exclamation marks or superlatives (great, amazing, excellent, etc.).
- Do not mention Bud, Rose, or Thorn.
- Do not tell the user what to do or what they should do.

Good examples:
"You tend to commit to actions in the evening but complete them in the morning."
"Your challenges cluster around consistency rather than capability."
"Patterns in your reflections point toward creative work as a low-friction activity."

Bad examples:
"Great job keeping up with your reflections!"
"You should try to build on your strengths!"
"You are amazing at staying motivated!"

Respond with ONLY the sentence. No preamble, no markdown, no quotation marks around the sentence.`;

type RawProfile = Record<string, unknown>;

function toStringArray(val: unknown): string[] {
  if (!Array.isArray(val)) return [];
  return val.filter((item): item is string => typeof item === 'string');
}

function toPatternArray(val: unknown): Array<{ theme: string }> {
  if (!Array.isArray(val)) return [];
  return val.filter(
    (item): item is { theme: string } =>
      typeof item === 'object' &&
      item !== null &&
      typeof (item as RawProfile)['theme'] === 'string',
  );
}

export function buildIntelligencePrompt(characterProfile: unknown): string {
  const raw: RawProfile =
    characterProfile &&
    typeof characterProfile === 'object' &&
    !Array.isArray(characterProfile)
      ? (characterProfile as RawProfile)
      : {};

  const interests = toStringArray(raw['interests']);
  const strengths = toStringArray(raw['strengths']);
  const challenges = toStringArray(raw['challenges']);
  const patterns = toPatternArray(raw['patterns']);

  return `Character profile:
Interests: ${interests.length > 0 ? interests.join(', ') : 'none recorded'}
Strengths: ${strengths.length > 0 ? strengths.join(', ') : 'none recorded'}
Challenges: ${challenges.length > 0 ? challenges.join(', ') : 'none recorded'}
Recurring patterns: ${patterns.length > 0 ? patterns.map((p) => p.theme).join(', ') : 'none recorded'}

Generate a single observational insight about this person.`;
}
