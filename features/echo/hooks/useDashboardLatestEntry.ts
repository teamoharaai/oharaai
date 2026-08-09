import { useEffect, useState } from 'react';
import { startPerformanceTimer, type LoadPhase } from '@/lib/diagnostics/performance';
import { subscribeToDashboardLatestEntryInvalidation } from '@/lib/events/entries';
import type { DashboardLatestEntrySummary } from '../dashboard-latest-entry';
import { fetchDashboardLatestEntry } from '../services/echo-service';

export function useDashboardLatestEntry(userId: string | null) {
  const [latestEntry, setLatestEntry] = useState<DashboardLatestEntrySummary | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(userId));
  const [refreshVersion, setRefreshVersion] = useState(0);

  useEffect(
    () => subscribeToDashboardLatestEntryInvalidation(
      () => setRefreshVersion((version) => version + 1),
    ),
    [],
  );

  useEffect(() => {
    let isActive = true;

    if (!userId) {
      setLatestEntry(null);
      setIsLoading(false);
      return () => {
        isActive = false;
      };
    }

    setIsLoading(true);
    const currentUserId = userId;
    const phase: LoadPhase = refreshVersion === 0 ? 'initial-load' : 'refresh';
    const timing = startPerformanceTimer('dashboard.latest-entry', { phase });

    async function loadLatestEntry() {
      try {
        const entry = await fetchDashboardLatestEntry(currentUserId);
        if (!isActive) return;
        setLatestEntry(entry);
        timing.end({
          success: true,
          resultCount: entry ? 1 : 0,
          requestCount: 1,
        });
      } catch {
        if (!isActive) return;
        setLatestEntry(null);
        timing.end({ success: false, requestCount: 1 });
      } finally {
        if (isActive) setIsLoading(false);
      }
    }

    void loadLatestEntry();
    return () => {
      isActive = false;
    };
  }, [refreshVersion, userId]);

  return { latestEntry, isLoading };
}

