import {
  useCallback,
  useEffect,
  useReducer,
  useRef,
  useState,
} from 'react';
import {
  addActiveAnnotation,
  archiveActiveAnnotation,
  replaceActiveAnnotation,
  replaceOptimisticAnnotation,
} from '../annotation-state';
import {
  ConstellationServiceError,
  archiveConstellationAnnotation,
  createConstellationAnnotation,
  fetchConstellationGraph,
  updateConstellationAnnotation,
} from '../services/constellation-service';
import {
  INITIAL_CONSTELLATION_CLIENT_STATE,
  reduceConstellationClientState,
} from '../state';
import type {
  ConstellationAnnotationDTO,
  ConstellationGraphDTO,
  CreateConstellationAnnotationInput,
  UpdateConstellationAnnotationInput,
} from '../types';

export interface ConstellationMutationState {
  error: string | null;
  isSaving: boolean;
  retryable: boolean;
}

const INITIAL_MUTATION_STATE: ConstellationMutationState = {
  error: null,
  isSaving: false,
  retryable: true,
};

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
  const mutationControllerRef = useRef<AbortController | null>(null);
  const mutationInFlightRef = useRef(false);
  const requestIdRef = useRef(0);
  const optimisticIdRef = useRef(0);
  const dtoRef = useRef<ConstellationGraphDTO | null>(null);
  const [mutation, setMutation] = useState(INITIAL_MUTATION_STATE);

  const replaceDto = useCallback((dto: ConstellationGraphDTO) => {
    dtoRef.current = dto;
    dispatch({ type: 'dto_replaced', dto });
  }, []);

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
      dtoRef.current = dto;
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
      mutationControllerRef.current?.abort();
    };
  }, [load]);

  const runMutation = useCallback(async (
    optimisticDto: ConstellationGraphDTO,
    save: (signal: AbortSignal) => Promise<ConstellationAnnotationDTO>,
    reconcile: (
      dto: ConstellationGraphDTO,
      annotation: ConstellationAnnotationDTO,
    ) => ConstellationGraphDTO,
  ): Promise<ConstellationAnnotationDTO | null> => {
    if (mutationInFlightRef.current) return null;
    const previousDto = dtoRef.current;
    if (!previousDto) return null;

    mutationInFlightRef.current = true;
    requestIdRef.current += 1;
    controllerRef.current?.abort();
    const controller = new AbortController();
    mutationControllerRef.current = controller;
    replaceDto(optimisticDto);
    setMutation({
      error: null,
      isSaving: true,
      retryable: true,
    });

    try {
      const annotation = await save(controller.signal);
      if (controller.signal.aborted) return null;
      replaceDto(reconcile(dtoRef.current ?? optimisticDto, annotation));
      setMutation(INITIAL_MUTATION_STATE);
      return annotation;
    } catch (error) {
      if (controller.signal.aborted || isAbortError(error)) return null;
      // The exact pre-mutation DTO is restored. No later refresh or mutation
      // can race this rollback because both are cancelled/single-flight above.
      replaceDto(previousDto);
      setMutation({
        error: error instanceof Error
          ? error.message
          : 'The annotation could not be saved.',
        isSaving: false,
        retryable: error instanceof ConstellationServiceError
          ? error.retryable
          : true,
      });
      return null;
    } finally {
      mutationInFlightRef.current = false;
      if (mutationControllerRef.current === controller) {
        mutationControllerRef.current = null;
      }
    }
  }, [replaceDto]);

  const createAnnotation = useCallback(async (
    input: CreateConstellationAnnotationInput,
  ) => {
    const dto = dtoRef.current;
    if (!dto || mutationInFlightRef.current) return null;
    const now = new Date().toISOString();
    const optimisticId = `optimistic-${++optimisticIdRef.current}`;
    const optimisticAnnotation: ConstellationAnnotationDTO = {
      id: optimisticId,
      selectionKey: `annotation:${optimisticId}`,
      kind: input.kind,
      status: 'draft',
      authorship: 'user',
      isDraft: true,
      label: input.label,
      body: input.body,
      anchorEarnedNodeId: input.anchorEarnedNodeId,
      createdAt: now,
      updatedAt: now,
      archivedAt: null,
    };

    return runMutation(
      addActiveAnnotation(dto, optimisticAnnotation),
      (signal) => createConstellationAnnotation(input, signal),
      (currentDto, annotation) => replaceOptimisticAnnotation(
        currentDto,
        optimisticId,
        annotation,
      ),
    );
  }, [runMutation]);

  const editAnnotation = useCallback(async (
    annotationId: string,
    input: UpdateConstellationAnnotationInput,
  ) => {
    const dto = dtoRef.current;
    const existing = dto?.annotations.find(
      (annotation) => annotation.id === annotationId,
    );
    if (!dto || !existing || mutationInFlightRef.current) return null;
    const optimisticAnnotation: ConstellationAnnotationDTO = {
      ...existing,
      ...input,
      updatedAt: new Date().toISOString(),
    } as ConstellationAnnotationDTO;

    return runMutation(
      replaceActiveAnnotation(dto, annotationId, optimisticAnnotation),
      (signal) => updateConstellationAnnotation(
        annotationId,
        input,
        signal,
      ),
      (currentDto, annotation) => replaceActiveAnnotation(
        currentDto,
        annotationId,
        annotation,
      ),
    );
  }, [runMutation]);

  const archiveAnnotation = useCallback(async (annotationId: string) => {
    const dto = dtoRef.current;
    if (
      !dto
      || mutationInFlightRef.current
      || !dto.annotations.some((annotation) => annotation.id === annotationId)
    ) {
      return null;
    }

    return runMutation(
      archiveActiveAnnotation(dto, annotationId),
      (signal) => archiveConstellationAnnotation(annotationId, signal),
      (currentDto) => currentDto,
    );
  }, [runMutation]);

  const clearMutationError = useCallback(() => {
    setMutation((current) => (
      current.isSaving ? current : INITIAL_MUTATION_STATE
    ));
  }, []);

  return {
    ...state,
    mutation,
    archiveAnnotation,
    clearMutationError,
    createAnnotation,
    editAnnotation,
    retry: load,
    refresh: mutation.isSaving ? () => undefined : load,
  };
}
