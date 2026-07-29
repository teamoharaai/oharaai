import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react';
import {
  hasEvidenceForEcho,
  INITIAL_ECHO_SEARCH_STATE,
  reduceConstellationEchoSearch,
  removeGoalEvidenceItem,
  replaceGoalEvidenceLink,
  upsertGoalEvidenceItem,
} from '../evidence-state';
import {
  ConstellationServiceError,
  createConstellationEvidenceReference,
  deleteConstellationEvidenceReference,
  fetchConstellationGoalEvidence,
  searchConstellationEchoes,
  updateConstellationEvidenceReference,
} from '../services/constellation-service';
import type {
  ConstellationEchoSearchOption,
  ConstellationGoalEvidenceDTO,
  ConstellationGoalEvidenceItem,
  CreateConstellationEvidenceReferenceInput,
  UpdateConstellationEvidenceReferenceInput,
} from '../types';

export type GoalEvidenceStatus = 'idle' | 'loading' | 'ready' | 'error';
export type GoalEvidenceMutationKind = 'create' | 'edit' | 'unlink';

export interface GoalEvidenceMutationState {
  kind: GoalEvidenceMutationKind | null;
  targetId: string | null;
  error: string | null;
  isSaving: boolean;
  retryable: boolean;
}

const INITIAL_MUTATION_STATE: GoalEvidenceMutationState = {
  kind: null,
  targetId: null,
  error: null,
  isSaving: false,
  retryable: true,
};

function isAbortError(error: unknown): boolean {
  return (
    (typeof DOMException !== 'undefined'
      && error instanceof DOMException
      && error.name === 'AbortError')
    || (error instanceof Error && error.name === 'AbortError')
  );
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export function useGoalEvidence({
  goalId,
  onItemsChanged,
}: {
  goalId: string | null;
  onItemsChanged: (
    goalId: string,
    items: readonly ConstellationGoalEvidenceItem[],
  ) => void;
}) {
  const [status, setStatus] = useState<GoalEvidenceStatus>(
    goalId ? 'loading' : 'idle',
  );
  const [dto, setDto] = useState<ConstellationGoalEvidenceDTO | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retryable, setRetryable] = useState(true);
  const [mutation, setMutation] = useState(INITIAL_MUTATION_STATE);
  const [search, dispatchSearch] = useReducer(
    reduceConstellationEchoSearch,
    INITIAL_ECHO_SEARCH_STATE,
  );
  const loadControllerRef = useRef<AbortController | null>(null);
  const searchControllerRef = useRef<AbortController | null>(null);
  const mutationControllerRef = useRef<AbortController | null>(null);
  const loadRequestIdRef = useRef(0);
  const searchRequestIdRef = useRef(0);
  const mutationInFlightRef = useRef(false);
  const rollbackRef = useRef<{
    goalId: string;
    items: readonly ConstellationGoalEvidenceItem[];
  } | null>(null);
  const activeGoalIdRef = useRef(goalId);
  const dtoRef = useRef<ConstellationGoalEvidenceDTO | null>(null);

  const commitDto = useCallback((
    nextDto: ConstellationGoalEvidenceDTO,
  ) => {
    if (activeGoalIdRef.current !== nextDto.goal.id) return;
    dtoRef.current = nextDto;
    setDto(nextDto);
    onItemsChanged(nextDto.goal.id, nextDto.items);
  }, [onItemsChanged]);

  const load = useCallback(async () => {
    const requestedGoalId = activeGoalIdRef.current;
    if (!requestedGoalId) return;
    const requestId = ++loadRequestIdRef.current;
    const controller = new AbortController();
    loadControllerRef.current?.abort();
    loadControllerRef.current = controller;
    setStatus('loading');
    setError(null);
    setRetryable(true);

    try {
      const result = await fetchConstellationGoalEvidence(
        requestedGoalId,
        controller.signal,
      );
      if (
        controller.signal.aborted
        || requestId !== loadRequestIdRef.current
        || requestedGoalId !== activeGoalIdRef.current
      ) {
        return;
      }
      commitDto(result);
      setStatus('ready');
    } catch (loadError) {
      if (
        controller.signal.aborted
        || requestId !== loadRequestIdRef.current
        || isAbortError(loadError)
      ) {
        return;
      }
      dtoRef.current = null;
      setDto(null);
      setStatus('error');
      setError(errorMessage(
        loadError,
        'Goal evidence could not be loaded.',
      ));
      setRetryable(
        loadError instanceof ConstellationServiceError
          ? loadError.retryable
          : true,
      );
    }
  }, [commitDto]);

  useEffect(() => {
    const pendingRollback = rollbackRef.current;
    if (pendingRollback) {
      onItemsChanged(pendingRollback.goalId, pendingRollback.items);
      rollbackRef.current = null;
    }
    activeGoalIdRef.current = goalId;
    loadRequestIdRef.current += 1;
    searchRequestIdRef.current += 1;
    loadControllerRef.current?.abort();
    searchControllerRef.current?.abort();
    mutationControllerRef.current?.abort();
    mutationInFlightRef.current = false;
    dtoRef.current = null;
    setDto(null);
    setError(null);
    setRetryable(true);
    setMutation(INITIAL_MUTATION_STATE);
    dispatchSearch({ type: 'reset', goalId });

    if (!goalId) {
      setStatus('idle');
      return;
    }
    void load();
  }, [goalId, load, onItemsChanged]);

  useEffect(() => () => {
    loadControllerRef.current?.abort();
    searchControllerRef.current?.abort();
    mutationControllerRef.current?.abort();
  }, []);

  const searchEchoes = useCallback(async (query: string) => {
    const requestedGoalId = activeGoalIdRef.current;
    if (!requestedGoalId) return;
    const normalizedQuery = query.trim().replace(/\s+/g, ' ');
    const requestId = ++searchRequestIdRef.current;
    const controller = new AbortController();
    searchControllerRef.current?.abort();
    searchControllerRef.current = controller;
    dispatchSearch({
      type: 'started',
      goalId: requestedGoalId,
      query: normalizedQuery,
      requestId,
    });

    try {
      const result = await searchConstellationEchoes(
        requestedGoalId,
        normalizedQuery,
        controller.signal,
      );
      if (controller.signal.aborted) return;
      dispatchSearch({
        type: 'succeeded',
        goalId: requestedGoalId,
        query: normalizedQuery,
        requestId,
        options: result.options,
      });
    } catch (searchError) {
      if (controller.signal.aborted || isAbortError(searchError)) return;
      dispatchSearch({
        type: 'failed',
        goalId: requestedGoalId,
        query: normalizedQuery,
        requestId,
        error: errorMessage(
          searchError,
          'Entries could not be searched.',
        ),
        retryable: searchError instanceof ConstellationServiceError
          ? searchError.retryable
          : true,
      });
    }
  }, []);

  const commitItems = useCallback((
    selectedGoalId: string,
    items: readonly ConstellationGoalEvidenceItem[],
  ) => {
    const current = dtoRef.current;
    if (!current || current.goal.id !== selectedGoalId) return;
    commitDto({ ...current, items });
  }, [commitDto]);

  const beginMutation = useCallback((
    kind: GoalEvidenceMutationKind,
    targetId: string,
  ): AbortController | null => {
    if (mutationInFlightRef.current) return null;
    mutationInFlightRef.current = true;
    const controller = new AbortController();
    mutationControllerRef.current = controller;
    setMutation({
      kind,
      targetId,
      error: null,
      isSaving: true,
      retryable: true,
    });
    return controller;
  }, []);

  const failMutation = useCallback((
    kind: GoalEvidenceMutationKind,
    targetId: string,
    mutationError: unknown,
  ) => {
    setMutation({
      kind,
      targetId,
      error: errorMessage(
        mutationError,
        'The evidence reference could not be saved.',
      ),
      isSaving: false,
      retryable: mutationError instanceof ConstellationServiceError
        ? mutationError.retryable
        : true,
    });
  }, []);

  const finishMutation = useCallback((controller: AbortController) => {
    mutationInFlightRef.current = false;
    if (mutationControllerRef.current === controller) {
      mutationControllerRef.current = null;
    }
  }, []);

  const addReference = useCallback(async (
    option: ConstellationEchoSearchOption,
    input: Omit<CreateConstellationEvidenceReferenceInput, 'echoEntryId' | 'goalId'>,
  ): Promise<boolean> => {
    const current = dtoRef.current;
    const selectedGoalId = activeGoalIdRef.current;
    if (!current || !selectedGoalId) return false;
    if (mutationInFlightRef.current) return false;
    if (hasEvidenceForEcho(current.items, option.id)) {
      setMutation({
        kind: 'create',
        targetId: option.id,
        error: 'This entry is already referenced under this goal.',
        isSaving: false,
        retryable: false,
      });
      return false;
    }

    const controller = beginMutation('create', option.id);
    if (!controller) return false;
    const previousItems = current.items;
    const now = new Date().toISOString();
    const optimistic: ConstellationGoalEvidenceItem = {
      id: `optimistic:${option.id}`,
      ownerId: 'optimistic',
      echoEntryId: option.id,
      goalId: selectedGoalId,
      brtCategory: input.brtCategory,
      note: input.note ?? null,
      createdAt: now,
      updatedAt: now,
      echo: {
        id: option.id,
        title: option.title,
        excerpt: option.excerpt,
        excerptTruncated: option.excerptTruncated,
        createdAt: option.createdAt,
      },
    };
    const optimisticItems = upsertGoalEvidenceItem(
      previousItems,
      optimistic,
    );
    rollbackRef.current = {
      goalId: selectedGoalId,
      items: previousItems,
    };
    commitItems(selectedGoalId, optimisticItems);

    try {
      const link = await createConstellationEvidenceReference({
        echoEntryId: option.id,
        goalId: selectedGoalId,
        ...input,
      }, controller.signal);
      if (
        controller.signal.aborted
        || activeGoalIdRef.current !== selectedGoalId
      ) {
        return false;
      }
      commitItems(
        selectedGoalId,
        upsertGoalEvidenceItem(
          optimisticItems,
          replaceGoalEvidenceLink(optimistic, link),
        ),
      );
      rollbackRef.current = null;
      setMutation(INITIAL_MUTATION_STATE);
      return true;
    } catch (mutationError) {
      if (controller.signal.aborted || isAbortError(mutationError)) return false;
      commitItems(selectedGoalId, previousItems);
      rollbackRef.current = null;
      failMutation('create', option.id, mutationError);
      return false;
    } finally {
      finishMutation(controller);
    }
  }, [beginMutation, commitItems, failMutation, finishMutation]);

  const editReference = useCallback(async (
    evidenceReferenceId: string,
    input: UpdateConstellationEvidenceReferenceInput,
  ): Promise<boolean> => {
    const current = dtoRef.current;
    const selectedGoalId = activeGoalIdRef.current;
    const existing = current?.items.find(
      (item) => item.id === evidenceReferenceId,
    );
    if (!current || !selectedGoalId || !existing) return false;

    const controller = beginMutation('edit', evidenceReferenceId);
    if (!controller) return false;
    const previousItems = current.items;
    const optimistic = {
      ...existing,
      ...input,
      updatedAt: new Date().toISOString(),
    };
    const optimisticItems = upsertGoalEvidenceItem(
      previousItems,
      optimistic,
    );
    rollbackRef.current = {
      goalId: selectedGoalId,
      items: previousItems,
    };
    commitItems(selectedGoalId, optimisticItems);

    try {
      const link = await updateConstellationEvidenceReference(
        evidenceReferenceId,
        input,
        controller.signal,
      );
      if (
        controller.signal.aborted
        || activeGoalIdRef.current !== selectedGoalId
      ) {
        return false;
      }
      commitItems(
        selectedGoalId,
        upsertGoalEvidenceItem(
          optimisticItems,
          replaceGoalEvidenceLink(optimistic, link),
        ),
      );
      rollbackRef.current = null;
      setMutation(INITIAL_MUTATION_STATE);
      return true;
    } catch (mutationError) {
      if (controller.signal.aborted || isAbortError(mutationError)) return false;
      commitItems(selectedGoalId, previousItems);
      rollbackRef.current = null;
      failMutation('edit', evidenceReferenceId, mutationError);
      return false;
    } finally {
      finishMutation(controller);
    }
  }, [beginMutation, commitItems, failMutation, finishMutation]);

  const unlinkReference = useCallback(async (
    evidenceReferenceId: string,
  ): Promise<boolean> => {
    const current = dtoRef.current;
    const selectedGoalId = activeGoalIdRef.current;
    if (
      !current
      || !selectedGoalId
      || !current.items.some((item) => item.id === evidenceReferenceId)
    ) {
      return false;
    }

    const controller = beginMutation('unlink', evidenceReferenceId);
    if (!controller) return false;
    const previousItems = current.items;
    rollbackRef.current = {
      goalId: selectedGoalId,
      items: previousItems,
    };
    commitItems(
      selectedGoalId,
      removeGoalEvidenceItem(previousItems, evidenceReferenceId),
    );

    try {
      await deleteConstellationEvidenceReference(
        evidenceReferenceId,
        controller.signal,
      );
      if (
        controller.signal.aborted
        || activeGoalIdRef.current !== selectedGoalId
      ) {
        return false;
      }
      rollbackRef.current = null;
      setMutation(INITIAL_MUTATION_STATE);
      return true;
    } catch (mutationError) {
      if (controller.signal.aborted || isAbortError(mutationError)) return false;
      commitItems(selectedGoalId, previousItems);
      rollbackRef.current = null;
      failMutation('unlink', evidenceReferenceId, mutationError);
      return false;
    } finally {
      finishMutation(controller);
    }
  }, [beginMutation, commitItems, failMutation, finishMutation]);

  const clearMutationError = useCallback(() => {
    setMutation((current) => (
      current.isSaving ? current : INITIAL_MUTATION_STATE
    ));
  }, []);

  const options = useMemo(() => {
    const referenceByEchoId = new Map(
      (dto?.items ?? []).map((item) => [item.echoEntryId, item]),
    );
    return search.options.map((option) => {
      const existing = referenceByEchoId.get(option.id);
      return {
        ...option,
        existingReference: existing
          ? {
              id: existing.id,
              brtCategory: existing.brtCategory,
            }
          : null,
      };
    });
  }, [dto?.items, search.options]);

  return {
    status,
    dto,
    error,
    retryable,
    mutation,
    search: { ...search, options },
    addReference,
    clearMutationError,
    editReference,
    retry: load,
    retrySearch: () => searchEchoes(search.query),
    searchEchoes,
    unlinkReference,
  };
}
