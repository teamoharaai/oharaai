import { useCallback, useState } from 'react';
import { useEchoStore } from '../store';
import { updateEntry } from '../services/echo-service';
import type { BrtCategory, EchoEntry } from '../types';

interface UseEditEntryOptions {
  // Called when a save fails because the entry no longer exists server-side
  // (404). EchoScreen wires this to the store's removeEntry so the vanished
  // entry leaves the list — same contract useMoveEntry's onEntryGone uses.
  onEntryGone?: (entryId: string) => void;
}

// Owns the edit flow the way useMoveEntry owns the move flow: the presentational
// inline edit form stays free of service calls (features/ rule 3), and this hook
// runs the updateEntry() PATCH → updateEntryFields() optimistic-patch sequence,
// tracking the active entry / isSaving / error the form renders.
export function useEditEntry({ onEntryGone }: UseEditEntryOptions = {}) {
  const updateEntryFields = useEchoStore((state) => state.updateEntryFields);

  const [activeEntry, setActiveEntry] = useState<EchoEntry | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const open = useCallback((entry: EchoEntry) => {
    setActiveEntry(entry);
    setError(null);
    setIsSaving(false);
  }, []);

  const close = useCallback(() => {
    setActiveEntry(null);
    setError(null);
    setIsSaving(false);
  }, []);

  const save = useCallback(
    async (changes: { content: string; title: string | null; brtCategory: BrtCategory }) => {
      if (!activeEntry) return;
      const entryId = activeEntry.id;

      setIsSaving(true);
      setError(null);
      try {
        const result = await updateEntry(entryId, changes);

        if (result.status === 'error') {
          if (result.kind === 'entry_not_found') {
            // Entry is gone server-side — drop it from the list and close.
            onEntryGone?.(entryId);
            close();
            return;
          }
          // offline / server / generic: keep the modal open with the message.
          setError(result.message);
          return;
        }

        updateEntryFields(entryId, changes);
        close();
      } finally {
        setIsSaving(false);
      }
    },
    [activeEntry, updateEntryFields, close, onEntryGone],
  );

  return { activeEntry, isSaving, error, open, close, save };
}
