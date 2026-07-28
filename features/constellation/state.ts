import type { ConstellationGraphDTO } from './types.ts';

export type ConstellationClientStatus = 'loading' | 'ready' | 'error';

export interface ConstellationClientState {
  status: ConstellationClientStatus;
  dto: ConstellationGraphDTO | null;
  error: string | null;
  retryable: boolean;
  isRefreshing: boolean;
  refreshError: string | null;
}

export type ConstellationClientAction =
  | { type: 'request_started' }
  | { type: 'request_succeeded'; dto: ConstellationGraphDTO }
  | { type: 'dto_replaced'; dto: ConstellationGraphDTO }
  | {
      type: 'request_failed';
      error: string;
      retryable: boolean;
    };

export const INITIAL_CONSTELLATION_CLIENT_STATE: ConstellationClientState = {
  status: 'loading',
  dto: null,
  error: null,
  retryable: true,
  isRefreshing: false,
  refreshError: null,
};

export function shouldClearConstellationSelection({
  hasDto,
  hasSelectionParam,
  isMutationSaving,
  selectedKey,
}: {
  hasDto: boolean;
  hasSelectionParam: boolean;
  isMutationSaving: boolean;
  selectedKey: string | null;
}): boolean {
  return (
    hasDto
    && hasSelectionParam
    && selectedKey === null
    && !isMutationSaving
  );
}

/**
 * Keeps the last successful owner-scoped DTO during refresh. A failed refresh
 * is surfaced separately from a first-load failure so a transient outage does
 * not replace safe stale graph data with a false empty state.
 */
export function reduceConstellationClientState(
  state: ConstellationClientState,
  action: ConstellationClientAction,
): ConstellationClientState {
  switch (action.type) {
    case 'request_started':
      return state.dto
        ? {
            ...state,
            status: 'ready',
            error: null,
            isRefreshing: true,
            refreshError: null,
          }
        : INITIAL_CONSTELLATION_CLIENT_STATE;
    case 'request_succeeded':
      return {
        status: 'ready',
        dto: action.dto,
        error: null,
        retryable: true,
        isRefreshing: false,
        refreshError: null,
      };
    case 'dto_replaced':
      return {
        ...state,
        status: 'ready',
        dto: action.dto,
      };
    case 'request_failed':
      return state.dto && action.retryable
        ? {
            ...state,
            status: 'ready',
            error: null,
            retryable: action.retryable,
            isRefreshing: false,
            refreshError: action.error,
          }
        : {
            status: 'error',
            dto: null,
            error: action.error,
            retryable: action.retryable,
            isRefreshing: false,
            refreshError: null,
          };
  }
}
