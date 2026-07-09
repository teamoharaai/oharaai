import { useCallback, useState } from 'react';
import supabase from '@/lib/db/client';
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

export function useMoveEntry() {
  const setEntryContainer = useEchoStore((state) => state.setEntryContainer);

  const [activeEntryId, setActiveEntryId] = useState<string | null>(null);
  const [folders, setFolders] = useState<EchoFolder[]>([]);
  const [currentContainer, setCurrentContainer] = useState<EntryContainer | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const open = useCallback(async (entryId: string) => {
    setActiveEntryId(entryId);
    setError(null);
    setIsLoading(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const accessToken = session?.access_token ?? '';

      const [folderList, container] = await Promise.all([
        fetchFolders(accessToken),
        getEntryContainer(entryId),
      ]);
      setFolders(folderList);
      setCurrentContainer(container);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const close = useCallback(() => {
    setActiveEntryId(null);
    setFolders([]);
    setCurrentContainer(null);
    setError(null);
  }, []);

  const confirm = useCallback(
    async (target: MoveTargetOption) => {
      if (!activeEntryId) return;

      setIsSaving(true);
      setError(null);
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        const accessToken = session?.access_token ?? '';

        const result = await moveEntryRequest(activeEntryId, target, accessToken);
        if (result.status === 'error') {
          setError(result.message);
          return;
        }

        setEntryContainer(
          activeEntryId,
          target.type === 'goal'
            ? { type: 'goal', goalId: target.id, goalTitle: target.title }
            : { type: 'folder', folderId: target.id, folderName: target.title },
        );
        close();
      } finally {
        setIsSaving(false);
      }
    },
    [activeEntryId, setEntryContainer, close],
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
