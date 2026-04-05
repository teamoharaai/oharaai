/**
 * isProfileSufficient
 *
 * Pure function — safe to import in both server (API routes) and client code.
 *
 * Returns true when the character_profile JSONB has enough content to generate
 * a meaningful intelligence insight. The threshold is conservative: at least 2
 * of [interests, strengths, challenges, patterns] must be non-empty arrays.
 *
 * Summarization writes to these keys. All four start empty on a new profile.
 * Block 6 may refine this threshold as real data accumulates.
 */

const PROFILE_SIGNAL_KEYS = [
  'interests',
  'strengths',
  'challenges',
  'patterns',
] as const;

export function isProfileSufficient(characterProfile: unknown): boolean {
  if (
    !characterProfile ||
    typeof characterProfile !== 'object' ||
    Array.isArray(characterProfile)
  ) {
    return false;
  }

  const profile = characterProfile as Record<string, unknown>;
  let filledCount = 0;

  for (const key of PROFILE_SIGNAL_KEYS) {
    const val = profile[key];
    if (Array.isArray(val) && val.length > 0) {
      filledCount++;
      if (filledCount >= 2) return true;
    }
  }

  return false;
}
