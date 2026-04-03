import { useEffect, useState, useCallback } from 'react';
import { useEchoStore } from '../store';
import { fetchEntries, createEntry, fetchActiveGoalsForPicker } from '../services/echo-service';
import supabase from '@/lib/db/client';

export function useEntries() {
  const { entries, isLoading, setEntries, prependEntry, setIsLoading } = useEchoStore();
  const [pickerGoals, setPickerGoals] = useState<Array<{ id: string; title: string }>>([]);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setIsLoading(true);
      const [fetchedEntries, goals] = await Promise.all([
        fetchEntries(user.id),
        fetchActiveGoalsForPicker(user.id),
      ]);
      setEntries(fetchedEntries);
      setPickerGoals(goals);
      setIsLoading(false);
    }
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveEntry = useCallback(async (
    content: string,
    goalId: string | null,
    aiInsightRequested: boolean,
  ): Promise<boolean> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const entry = await createEntry({ userId: user.id, content, goalId, aiInsightRequested });
    if (!entry) return false;

    prependEntry(entry);
    return true;
  }, [prependEntry]);

  return { entries, isLoading, pickerGoals, saveEntry };
}
