import { useCallback, useEffect, useRef, useState } from 'react';
import {
  toConstellationGateSuccess,
  type DashboardSummary,
} from '../gate';
import {
  fetchDashboardSummary,
  ConstellationServiceError,
} from '../services/constellation-service';

export type ConstellationGateStatus =
  | 'loading'
  | 'success'
  | 'error'
  | 'cancelled';

interface ConstellationGateState {
  status: ConstellationGateStatus;
  summary: DashboardSummary | null;
  accessEligible: boolean;
  hasGraphData: boolean | null;
  error: string | null;
  retryable: boolean;
}

const INITIAL_STATE: ConstellationGateState = {
  status: 'loading',
  summary: null,
  accessEligible: false,
  hasGraphData: null,
  error: null,
  retryable: false,
};

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

/**
 * Loads the existing authenticated dashboard summary as an onboarding gate.
 * It deliberately leaves hasGraphData unknown: activity counts cannot prove
 * that an earned Constellation node exists.
 */
export function useConstellationGate() {
  const [state, setState] = useState<ConstellationGateState>(INITIAL_STATE);
  const [requestKey, setRequestKey] = useState(0);
  const controllerRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const requestId = ++requestIdRef.current;
    controllerRef.current?.abort();
    controllerRef.current = controller;
    setState(INITIAL_STATE);

    async function load() {
      try {
        const summary = await fetchDashboardSummary(controller.signal);
        if (
          !mountedRef.current
          || controller.signal.aborted
          || requestId !== requestIdRef.current
        ) {
          return;
        }

        const gate = toConstellationGateSuccess(summary);
        setState({
          status: 'success',
          summary: gate.summary,
          accessEligible: gate.accessEligible,
          hasGraphData: gate.hasGraphData,
          error: null,
          retryable: false,
        });
      } catch (error) {
        if (!mountedRef.current || requestId !== requestIdRef.current) return;

        if (controller.signal.aborted || isAbortError(error)) {
          setState({
            status: 'cancelled',
            summary: null,
            accessEligible: false,
            hasGraphData: null,
            error: null,
            retryable: true,
          });
          return;
        }

        setState({
          status: 'error',
          summary: null,
          accessEligible: false,
          hasGraphData: null,
          error:
            error instanceof Error
              ? error.message
              : 'Your activity progress could not be loaded.',
          retryable:
            error instanceof ConstellationServiceError
              ? error.retryable
              : true,
        });
      }
    }

    void load();
    return () => {
      controller.abort();
    };
  }, [requestKey]);

  const retry = useCallback(() => {
    setRequestKey((value) => value + 1);
  }, []);

  const cancel = useCallback(() => {
    requestIdRef.current += 1;
    controllerRef.current?.abort();
    setState({
      status: 'cancelled',
      summary: null,
      accessEligible: false,
      hasGraphData: null,
      error: null,
      retryable: true,
    });
  }, []);

  return {
    ...state,
    retry,
    cancel,
  };
}
