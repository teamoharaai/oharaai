import { authedFetch } from './client';
import type { BrtCategory } from '@/lib/utils/resolveBrt';

// Single write target for echo_entries.brt_category: the Constellation
// evidence panel (features/constellation) calls this directly since it
// cannot import features/echo/services/echo-service.ts (features/CLAUDE.md
// rule 2, no cross-feature imports). The entry-settings edit form instead
// folds brtCategory into its own richer updateEntry() PATCH, but both paths
// hit the same PATCH /api/entries/:id route and column.
export async function updateEchoEntryBrtCategory(
  entryId: string,
  brtCategory: BrtCategory,
): Promise<boolean> {
  try {
    const response = await authedFetch(`/api/entries/${entryId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ brtCategory }),
    });
    return response.ok;
  } catch {
    return false;
  }
}
