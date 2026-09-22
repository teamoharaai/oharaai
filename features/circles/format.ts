/**
 * Small pure presentation helpers for Circles. Server DTOs carry ISO timestamps,
 * free-form category/status strings, and full display names; these adapt them to
 * the view without a fixture lookup.
 */
import type { GoalCreationCategory } from '@/lib/goals/schema';
import type { CirclesAuthor } from '@/lib/db/circles-core';
import { productCategory } from '../../lib/goals/product-categories';

/** Historical snapshots with no approved mapping receive neutral presentation. */
export function toCategory(value: string | null | undefined, goalId?: string): GoalCreationCategory | null {
  if (!value) return null;
  try { return productCategory(value, goalId); } catch { return null; }
}

/** First name from a display name, for the quieter "Shared by X" copy. */
export function firstName(author: CirclesAuthor | null | undefined): string {
  const name = author?.displayName?.trim() || author?.username?.trim() || '';
  return name.split(/\s+/)[0] ?? '';
}

/** Best-effort display label for an author who may not have hydrated. */
export function authorName(author: CirclesAuthor | null | undefined): string {
  return author?.displayName?.trim() || author?.username?.trim() || 'Someone';
}

/** Compact relative time ("Just now", "2h ago", "3d ago", or a date). */
export function formatRelativeTime(iso: string | null | undefined): string {
  if (!iso) return '';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const diffMs = Date.now() - then;
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(then).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export type GoalBadgeVariant = 'active' | 'paused' | 'complete';

/** Map a real goal status to the shared status badge. */
export function goalStatusBadge(status: string): { label: string; variant: GoalBadgeVariant } {
  switch (status) {
    case 'complete':
      return { label: 'Completed', variant: 'complete' };
    case 'discovered':
    case 'draft':
      return { label: 'Not started', variant: 'paused' };
    case 'stagnant':
      return { label: 'Stagnant', variant: 'paused' };
    default:
      return { label: 'In progress', variant: 'active' };
  }
}
