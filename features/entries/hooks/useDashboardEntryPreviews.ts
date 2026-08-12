import { useEffect, useMemo, useState } from 'react';
import { subscribeToDashboardLatestEntryInvalidation } from '@/lib/events/entries';
import { fetchEntries } from '../services/entry-service';
import {
  selectLatestDashboardEntry,
  type DashboardEntryPreview,
} from '../dashboard-entry-previews';
import type { EntryRecord } from '../types';

export function useDashboardEntryPreviews(userId: string | null): {
  isLoading: boolean;
  note: DashboardEntryPreview | null;
  reflection: DashboardEntryPreview | null;
} {
  const [entries, setEntries] = useState<EntryRecord[]>([]);
  const [isLoading, setIsLoading] = useState(Boolean(userId));
  const [refreshVersion, setRefreshVersion] = useState(0);

  useEffect(
    () => subscribeToDashboardLatestEntryInvalidation(
      () => setRefreshVersion((version) => version + 1),
    ),
    [],
  );

  useEffect(() => {
    let active = true;
    if (!userId) {
      setEntries([]);
      setIsLoading(false);
      return () => { active = false; };
    }

    setIsLoading(true);
    void fetchEntries()
      .then((nextEntries) => {
        if (active) setEntries(nextEntries);
      })
      .catch(() => {
        if (active) setEntries([]);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => { active = false; };
  }, [refreshVersion, userId]);

  return useMemo(() => ({
    isLoading,
    note: selectLatestDashboardEntry(entries, 'note'),
    reflection: selectLatestDashboardEntry(entries, 'reflection'),
  }), [entries, isLoading]);
}
