import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react';
import type { ConstellationNodePosition } from '../layout';
import {
  fetchConstellationLayout,
  resetConstellationLayout,
  saveConstellationLayoutPosition,
} from '../services/constellation-service';

type LayoutPositions = Readonly<Record<string, ConstellationNodePosition>>;

function positionRecord(
  positions: Awaited<ReturnType<typeof fetchConstellationLayout>>['positions'],
): LayoutPositions {
  return Object.fromEntries(positions.map((position) => [
    position.selectionKey,
    {
      coordinateSpace: position.coordinateSpace,
      x: position.x,
      y: position.y,
    },
  ]));
}

function samePosition(
  left: ConstellationNodePosition | undefined,
  right: ConstellationNodePosition,
): boolean {
  return (
    left?.coordinateSpace === right.coordinateSpace
    && left?.x === right.x
    && left?.y === right.y
  );
}

export interface UseConstellationLayoutResult {
  error: string | null;
  isLoading: boolean;
  isResetting: boolean;
  isSaving: boolean;
  persistPosition: (
    selectionKey: string,
    position: ConstellationNodePosition,
  ) => Promise<boolean>;
  positions: LayoutPositions;
  reset: () => Promise<boolean>;
  setPositions: Dispatch<SetStateAction<LayoutPositions>>;
}

export function useConstellationLayout(): UseConstellationLayoutResult {
  const [positions, setPositions] = useState<LayoutPositions>({});
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isResetting, setIsResetting] = useState(false);
  const [savingCount, setSavingCount] = useState(0);
  const controllersRef = useRef(new Set<AbortController>());

  useEffect(() => {
    const controller = new AbortController();
    controllersRef.current.add(controller);
    void fetchConstellationLayout(controller.signal)
      .then((dto) => {
        if (controller.signal.aborted) return;
        setPositions((current) => ({
          ...positionRecord(dto.positions),
          ...current,
        }));
        setError(null);
      })
      .catch((loadError: unknown) => {
        if (controller.signal.aborted) return;
        setError(
          loadError instanceof Error
            ? loadError.message
            : 'The Constellation layout could not be loaded.',
        );
      })
      .finally(() => {
        controllersRef.current.delete(controller);
        if (!controller.signal.aborted) setIsLoading(false);
      });

    return () => {
      for (const activeController of controllersRef.current) {
        activeController.abort();
      }
      controllersRef.current.clear();
    };
  }, []);

  const persistPosition = useCallback(async (
    selectionKey: string,
    position: ConstellationNodePosition,
  ): Promise<boolean> => {
    const coordinateSpace = position.coordinateSpace ?? 'canvas';
    const controller = new AbortController();
    controllersRef.current.add(controller);
    setSavingCount((count) => count + 1);
    setError(null);
    try {
      const saved = await saveConstellationLayoutPosition({
        selectionKey,
        coordinateSpace,
        x: position.x,
        y: position.y,
      }, controller.signal);
      const savedPosition: ConstellationNodePosition = {
        coordinateSpace: saved.coordinateSpace,
        x: saved.x,
        y: saved.y,
      };
      setPositions((current) => (
        samePosition(current[selectionKey], position)
          ? { ...current, [selectionKey]: savedPosition }
          : current
      ));
      return true;
    } catch (saveError) {
      if (!controller.signal.aborted) {
        setError(
          saveError instanceof Error
            ? saveError.message
            : 'The Constellation layout could not be saved.',
        );
      }
      return false;
    } finally {
      controllersRef.current.delete(controller);
      if (!controller.signal.aborted) {
        setSavingCount((count) => Math.max(0, count - 1));
      }
    }
  }, []);

  const reset = useCallback(async (): Promise<boolean> => {
    const controller = new AbortController();
    controllersRef.current.add(controller);
    setIsResetting(true);
    setError(null);
    try {
      await resetConstellationLayout(controller.signal);
      setPositions({});
      return true;
    } catch (resetError) {
      if (!controller.signal.aborted) {
        setError(
          resetError instanceof Error
            ? resetError.message
            : 'The Constellation layout could not be reset.',
        );
      }
      return false;
    } finally {
      controllersRef.current.delete(controller);
      if (!controller.signal.aborted) setIsResetting(false);
    }
  }, []);

  return {
    error,
    isLoading,
    isResetting,
    isSaving: savingCount > 0,
    persistPosition,
    positions,
    reset,
    setPositions,
  };
}
