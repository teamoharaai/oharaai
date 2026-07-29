import { useCallback, useEffect, useRef, useState } from 'react';
import { updateEchoEntryBrtCategory } from '@/lib/api/echo-entries';
import {
  ConstellationServiceError,
  fetchConstellationBrtInspector,
} from '../services/constellation-service';
import type {
  ConstellationBrtCategory,
  ConstellationBrtInspectorDTO,
} from '../types';

type BrtInspectorStatus = 'idle' | 'loading' | 'ready' | 'error';

export function useBrtInspector(category: ConstellationBrtCategory | null) {
  const [status, setStatus] = useState<BrtInspectorStatus>('idle');
  const [dto, setDto] = useState<ConstellationBrtInspectorDTO | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retryable, setRetryable] = useState(true);
  const [savingEntryId, setSavingEntryId] = useState<string | null>(null);
  const requestIdRef = useRef(0);
  const controllerRef = useRef<AbortController | null>(null);

  const load = useCallback(async () => {
    if (!category) {
      setStatus('idle');
      setDto(null);
      setError(null);
      return;
    }
    const requestId = ++requestIdRef.current;
    const controller = new AbortController();
    controllerRef.current?.abort();
    controllerRef.current = controller;
    setStatus('loading');
    setError(null);
    try {
      const result = await fetchConstellationBrtInspector(
        category,
        controller.signal,
      );
      if (controller.signal.aborted || requestId !== requestIdRef.current) return;
      setDto(result);
      setStatus('ready');
      setRetryable(true);
    } catch (loadError) {
      if (
        controller.signal.aborted
        || requestId !== requestIdRef.current
        || (loadError instanceof Error && loadError.name === 'AbortError')
      ) {
        return;
      }
      setDto(null);
      setStatus('error');
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'BRT entries could not be loaded.',
      );
      setRetryable(
        loadError instanceof ConstellationServiceError
          ? loadError.retryable
          : true,
      );
    }
  }, [category]);

  useEffect(() => {
    void load();
    return () => {
      requestIdRef.current += 1;
      controllerRef.current?.abort();
    };
  }, [load]);

  const reclassify = useCallback(async (
    entryId: string,
    nextCategory: ConstellationBrtCategory | null,
  ): Promise<boolean> => {
    if (!dto || savingEntryId) return false;
    setSavingEntryId(entryId);
    setError(null);
    const saved = await updateEchoEntryBrtCategory(entryId, nextCategory);
    if (saved) {
      setDto((current) => current
        ? {
            ...current,
            entries: current.entries.filter((entry) => entry.id !== entryId),
          }
        : current);
    } else {
      setError('The entry category could not be saved.');
    }
    setSavingEntryId(null);
    return saved;
  }, [dto, savingEntryId]);

  return {
    dto,
    error,
    reclassify,
    retry: load,
    retryable,
    savingEntryId,
    status,
  };
}
