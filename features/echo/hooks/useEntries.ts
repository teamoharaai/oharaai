import { useEffect, useState, useCallback } from 'react';
import { useEchoStore } from '../store';
import {
  fetchEntries,
  createEntry,
  fetchActiveGoalsForPicker,
  getSubmissionFailureStatus,
  type CreateEntryResult,
} from '../services/echo-service';
import supabase from '@/lib/db/client';
import type { EchoBrt, EchoEmotion } from '../types';

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
    brt: EchoBrt | null,
    emotion: EchoEmotion | null,
    title: string | null,
  ): Promise<CreateEntryResult> => {
    let user;
    try {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      user = authUser;
    } catch (error) {
      return { status: getSubmissionFailureStatus(error) };
    }

    if (!user) return { status: 'unconfirmed' };

    const result = await createEntry({
      userId: user.id,
      content,
      goalId,
      aiInsightRequested,
      brt,
      emotion,
      title,
    });
    if (result.entry) {
      prependEntry(result.entry);
    }

    return result;
  }, [prependEntry]);

  return { entries, isLoading, pickerGoals, saveEntry };
}
