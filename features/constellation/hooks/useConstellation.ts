import { useCallback, useEffect, useReducer, useRef } from 'react';
import {
  ConstellationServiceError,
  fetchConstellationGraph,
} from '../services/constellation-service';
import {
  INITIAL_CONSTELLATION_CLIENT_STATE,
  reduceConstellationClientState,
} from '../state';

function isAbortError(error: unknown): boolean {
  return (
    (typeof DOMException !== 'undefined'
      && error instanceof DOMException
      && error.name === 'AbortError')
    || (
      error instanceof Error
      && error.name === 'AbortError'
    )
  );
}

export function useConstellation() {
  const [state, dispatch] = useReducer(
    reduceConstellationClientState,
    INITIAL_CONSTELLATION_CLIENT_STATE,
  );
  const controllerRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);

  const load = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    const controller = new AbortController();
    controllerRef.current?.abort();
    controllerRef.current = controller;
    dispatch({ type: 'request_started' });

    try {
      const dto = await fetchConstellationGraph(controller.signal);
      if (
        controller.signal.aborted
        || requestId !== requestIdRef.current
      ) {
        return;
      }
      dispatch({ type: 'request_succeeded', dto });
    } catch (error) {
      if (
        controller.signal.aborted
        || requestId !== requestIdRef.current
        || isAbortError(error)
      ) {
        return;
      }

      dispatch({
        type: 'request_failed',
        error: error instanceof Error
          ? error.message
          : 'Constellation could not be loaded.',
        retryable: error instanceof ConstellationServiceError
          ? error.retryable
          : true,
      });
    }
  }, []);

  useEffect(() => {
    void load();
    return () => {
      requestIdRef.current += 1;
      controllerRef.current?.abort();
    };
  }, [load]);

  return {
    ...state,
    retry: load,
    refresh: load,
  };
}
