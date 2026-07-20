import { EMBEDDING_MIN_WORD_COUNT } from './constants';

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/**
 * Build embedding text for an echo entry.
 * Returns the trimmed content, or null if too short.
 */
export function buildEchoEmbeddingText(content: string): string | null {
  const trimmed = content.trim();
  if (wordCount(trimmed) < EMBEDDING_MIN_WORD_COUNT) return null;
  return trimmed;
}

/**
 * Build embedding text for a goal.
 * Concatenates title, description, one-time milestones, and tracker titles.
 * Never returns null — title alone is sufficient.
 */
export function buildGoalEmbeddingText(
  title: string,
  description: string | null,
  milestones: Array<{ title?: string; description?: string | null }> | null,
  trackers: Array<{ title?: string }> | null = null,
): string {
  let text = title;

  if (description) {
    text += `. ${description}`;
  }

  if (milestones && milestones.length > 0) {
    const milestoneTexts = milestones
      .map((milestone) => milestone.title?.trim() ?? '')
      .filter(Boolean);
    if (milestoneTexts.length > 0) {
      text += `. Milestones: ${milestoneTexts.join(', ')}`;
    }
  }

  if (trackers && trackers.length > 0) {
    const trackerTexts = trackers
      .map((tracker) => tracker.title?.trim() ?? '')
      .filter(Boolean);
    if (trackerTexts.length > 0) {
      text += `. Trackers: ${trackerTexts.join(', ')}`;
    }
  }

  return text;
}

/**
 * Build embedding text for a vault item.
 * Returns trimmed content, or null if too short or no content.
 */
export function buildVaultItemEmbeddingText(content: string | null): string | null {
  if (!content) return null;
  const trimmed = content.trim();
  if (!trimmed) return null;
  if (wordCount(trimmed) < EMBEDDING_MIN_WORD_COUNT) return null;
  return trimmed;
}
