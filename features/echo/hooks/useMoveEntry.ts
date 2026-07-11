import { useCallback, useRef, useState } from 'react';
import type { EchoFolder } from '@/types/echo-folder';
import { useEchoStore } from '../store';
import {
  fetchFolders,
  getEntryContainer,
  moveEntryRequest,
  type EntryContainer,
} from '../services/echo-service';

export type MoveTargetOption =
  | { type: 'goal'; id: string; title: string }
  | { type: 'folder'; id: string; title: string };

interface UseMoveEntryOptions {
  // Called when a move fails because the entry itself no longer exists (404).
  // EchoScreen wires this to the store's removeEntry so the vanished entry
  // leaves the list.
  onEntryGone?: (entryId: string) => void;
  // Called when a move fails because the target goal/folder vanished (404).
  // EchoScreen wires this to reload the goal picker; folders are refreshed
  // here in the hook since the hook owns them.
  onTargetsStale?: () => void;
}

export function useMoveEntry({ onEntryGone, onTargetsStale }: UseMoveEntryOptions = {}) {
  const setEntryContainer = useEchoStore((state) => state.setEntryContainer);

  const [activeEntryId, setActiveEntryId] = useState<string | null>(null);
  const [folders, setFolders] = useState<EchoFolder[]>([]);
  const [currentContainer, setCurrentContainer] = useState<EntryContainer | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Tracks the entry whose preselect fetch is currently authoritative. A rapid
  // open(B) (or a close) supersedes an in-flight open(A) so a late-resolving A
  // can't overwrite B's folders/currentContainer with stale data.
  const activeRequestRef = useRef<string | null>(null);

  const open = useCallback(async (entryId: string) => {
    activeRequestRef.current = entryId;
    setActiveEntryId(entryId);
    setError(null);
    setIsLoading(true);
    try {
      const [folderList, container] = await Promise.all([
        fetchFolders(),
        getEntryContainer(entryId),
      ]);
      if (activeRequestRef.current !== entryId) return; // superseded — drop stale result
      setFolders(folderList);
      setCurrentContainer(container);
    } finally {
      if (activeRequestRef.current === entryId) setIsLoading(false);
    }
  }, []);

  const close = useCallback(() => {
    activeRequestRef.current = null;
    setActiveEntryId(null);
    setFolders([]);
    setCurrentContainer(null);
    setError(null);
    setIsLoading(false);
  }, []);

  const confirm = useCallback(
    async (target: MoveTargetOption) => {
      if (!activeEntryId) return;
      const entryId = activeEntryId;

      setIsSaving(true);
      setError(null);
      try {
        const result = await moveEntryRequest(entryId, target);

        if (result.status === 'error') {
          if (result.kind === 'entry_not_found') {
            // Entry is gone server-side — drop it from the list and close.
            onEntryGone?.(entryId);
            close();
            return;
          }
          if (result.kind === 'target_not_found') {
            // Destination vanished — refresh the picker's options (folders here,
            // goals via callback) and keep the modal open so the user re-picks.
            onTargetsStale?.();
            try {
              const refreshedFolders = await fetchFolders();
              if (activeRequestRef.current === entryId) setFolders(refreshedFolders);
            } catch {
              // leave the stale folder list rather than blanking the picker
            }
            setError(result.message);
            return;
          }
          setError(result.message);
          return;
        }

        setEntryContainer(
          entryId,
          target.type === 'goal'
            ? { type: 'goal', goalId: target.id, goalTitle: target.title }
            : { type: 'folder', folderId: target.id, folderName: target.title },
        );
        close();
      } finally {
        setIsSaving(false);
      }
    },
    [activeEntryId, setEntryContainer, close, onEntryGone, onTargetsStale],
  );

  return {
    activeEntryId,
    folders,
    currentContainer,
    isLoading,
    isSaving,
    error,
    open,
    close,
    confirm,
  };
}
