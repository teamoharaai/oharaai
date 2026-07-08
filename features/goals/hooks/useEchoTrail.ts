// NOTE: The task spec assumed getEchoEntriesForGoal did not exist in lib/db/. It does.
// We use it directly rather than calling /api/echo-links (which does not accept ?goalId).
// Mutations (confirmLink, dismissLink) use the API routes — same Bearer pattern as useActivity.

import { useState, useCallback } from 'react';
import supabase from '@/lib/db/client';
import { getEchoEntriesForGoal } from '@/lib/db/echo-entry-links';
import type { EchoBrt } from '@/features/echo/types';
import type { EchoTrailEntry } from '@/features/goals/components/EchoTrail';

export type { EchoTrailEntry };

// Derives a single dominant BRT label from the structured BRT object returned by AI.
// Picks whichever category has the most entries; falls back to null if all are empty.
function deriveBrtLabel(brt: EchoBrt | undefined): 'Bud' | 'Rose' | 'Thorn' | null {
  if (!brt) return null;
  const scores: Array<['Bud' | 'Rose' | 'Thorn', number]> = [
    ['Bud', brt.bud.length],
    ['Rose', brt.rose.length],
    ['Thorn', brt.thorn.length],
  ];
  const best = scores.reduce((a, b) => (b[1] > a[1] ? b : a));
  return best[1] > 0 ? best[0] : null;
}

type UseEchoTrailResult = {
  entries: EchoTrailEntry[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  confirmLink: (linkId: string) => Promise<void>;
  dismissLink: (linkId: string) => Promise<void>;
};

export function useEchoTrail(goalId: string): UseEchoTrailResult {
  const [entries, setEntries] = useState<EchoTrailEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!goalId) return;
    setLoading(true);
    setError(null);
    try {
      const raw = await getEchoEntriesForGoal(goalId);
      setEntries(
        raw.map((e) => ({
          linkId: e.linkMetadata.id,
          echoEntryId: e.id,
          confirmed: e.linkMetadata.confirmed,
          createdAt: e.createdAt.toISOString(),
          content: e.content,
          brt: deriveBrtLabel(e.brt),
        })),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load echo trail');
    } finally {
      setLoading(false);
    }
  }, [goalId]);

  // PUT /api/echo-links/:linkId — marks link confirmed: true
  const confirmLink = useCallback(async (linkId: string) => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.access_token) return;

    await fetch(`/api/echo-links/${linkId}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
    });

    setEntries((prev) =>
      prev.map((e) => (e.linkId === linkId ? { ...e, confirmed: true } : e)),
    );
  }, []);

  // DELETE /api/echo-links/:linkId — removes the link row
  const dismissLink = useCallback(async (linkId: string) => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.access_token) return;

    await fetch(`/api/echo-links/${linkId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${session.access_token}` },
    });

    setEntries((prev) => prev.filter((e) => e.linkId !== linkId));
  }, []);

  return { entries, loading, error, refresh, confirmLink, dismissLink };
}
