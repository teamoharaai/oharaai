import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ConstellationServiceError,
  fetchConstellationReflectionInspector,
} from '../services/constellation-service';
import type { ConstellationReflectionInspectorDTO } from '../types';

type ReflectionInspectorStatus = 'idle' | 'loading' | 'ready' | 'error';

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}

export function useReflectionInspector(nodeId: string | null) {
  const [status, setStatus] = useState<ReflectionInspectorStatus>('idle');
  const [dto, setDto] =
    useState<ConstellationReflectionInspectorDTO | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retryable, setRetryable] = useState(true);
  const requestIdRef = useRef(0);
  const controllerRef = useRef<AbortController | null>(null);

  const load = useCallback(async () => {
    if (!nodeId) {
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
    setDto(null);
    setError(null);

    try {
      const result = await fetchConstellationReflectionInspector(
        nodeId,
        controller.signal,
      );
      if (controller.signal.aborted || requestId !== requestIdRef.current) {
        return;
      }
      setDto(result);
      setStatus('ready');
      setRetryable(true);
    } catch (loadError) {
      if (
        controller.signal.aborted
        || requestId !== requestIdRef.current
        || isAbortError(loadError)
      ) {
        return;
      }
      setStatus('error');
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'Reflection details could not be loaded.',
      );
      setRetryable(
        loadError instanceof ConstellationServiceError
          ? loadError.retryable
          : true,
      );
    }
  }, [nodeId]);

  useEffect(() => {
    void load();
    return () => {
      requestIdRef.current += 1;
      controllerRef.current?.abort();
    };
  }, [load]);

  return {
    dto,
    error,
    retry: load,
    retryable,
    status,
  };
}
