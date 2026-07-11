import { useEffect, useState, useCallback } from 'react';
import { useEchoStore } from '../store';
import {
  fetchEntries,
  createEntry,
  fetchContainerOptions,
  getSubmissionFailureStatus,
  type CreateEntryResult,
} from '../services/echo-service';
import supabase from '@/lib/db/client';
import type { EchoBrt, EchoContainerOption, EchoEmotion, EchoGoalOption } from '../types';

export function useEntries() {
  const { entries, isLoading, setEntries, prependEntry, setIsLoading } = useEchoStore();
  const [pickerGoals, setPickerGoals] = useState<EchoGoalOption[]>([]);
  const [containerOptions, setContainerOptions] = useState<EchoContainerOption[]>([]);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setIsLoading(true);
      const [fetchedEntries, containers] = await Promise.all([
        fetchEntries(user.id),
        fetchContainerOptions(user.id),
      ]);
      setEntries(fetchedEntries);
      setPickerGoals(containers.goals);
      setContainerOptions(containers.options);
      setIsLoading(false);
    }
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-fetch just the goal picker options — used when a move target turns out
  // to no longer exist, so a deleted goal drops out of the picker.
  const reloadPickerGoals = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const containers = await fetchContainerOptions(user.id);
    setPickerGoals(containers.goals);
    setContainerOptions(containers.options);
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

  return { entries, isLoading, pickerGoals, containerOptions, saveEntry, reloadPickerGoals };
}
