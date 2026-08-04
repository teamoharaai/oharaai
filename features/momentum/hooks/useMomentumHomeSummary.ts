import { useCallback, useEffect, useState } from 'react';
import { authedFetch } from '@/lib/api/client';
import type { MomentumHomeSummary } from '../types';

type MomentumResponse = { data?: MomentumHomeSummary; error?: string };

export function useMomentumHomeSummary(): {
  error: string | null;
  isLoading: boolean;
  refresh: () => Promise<void>;
  summary: MomentumHomeSummary | null;
} {
  const [summary, setSummary] = useState<MomentumHomeSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await authedFetch('/api/momentum');
      const payload = (await response.json()) as MomentumResponse;
      if (!response.ok || !payload.data) throw new Error(payload.error ?? 'Momentum is unavailable');
      setSummary(payload.data);
    } catch (loadError) {
      setSummary(null);
      setError(loadError instanceof Error ? loadError.message : 'Momentum is unavailable');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);
  return { error, isLoading, refresh: load, summary };
}
