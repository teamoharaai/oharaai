import { authedFetch } from '@/lib/api/client';
import type { DeadlineDensity } from '@/lib/db/deadlines';

export type { DeadlineDensity, DeadlineDay, DeadlineKind } from '@/lib/db/deadlines';

/**
 * Cross-goal deadline density fetched in one round-trip from `/api/deadlines`
 * (Phase 3 aggregator). Degrades gracefully to an empty map — a failed load
 * just renders an empty deadline calendar, never a wrong count.
 */
export async function fetchDeadlineDensity(): Promise<DeadlineDensity> {
  const res = await authedFetch('/api/deadlines');
  if (!res.ok) {
    throw new Error(`deadlines: server responded with status ${res.status}`);
  }
  const body = (await res.json()) as { density?: DeadlineDensity };
  return body.density ?? {};
}
