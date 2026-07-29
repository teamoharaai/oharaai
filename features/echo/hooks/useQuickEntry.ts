import { useCallback, useEffect, useState } from 'react';
import supabase from '@/lib/db/client';
import {
  createEntry,
  fetchGoalsForPicker,
  getSubmissionFailureStatus,
  type CreateEntryResult,
} from '../services/echo-service';
import { useEchoStore } from '../store';
import type { EchoBrt, EchoEmotion, EchoGoalOption } from '../types';

export function useQuickEntry(visible: boolean) {
  const prependEntry = useEchoStore((state) => state.prependEntry);
  const [goals, setGoals] = useState<EchoGoalOption[]>([]);

  useEffect(() => {
    if (!visible) return;

    let isActive = true;

    async function loadGoals() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user || !isActive) return;

        const nextGoals = await fetchGoalsForPicker(user.id);
        if (isActive) setGoals(nextGoals);
      } catch {
        if (isActive) setGoals([]);
      }
    }

    void loadGoals();
    return () => {
      isActive = false;
    };
  }, [visible]);

  const saveEntry = useCallback(async (
    content: string,
    goalId: string | null,
    aiInsightRequested: boolean,
    brt: EchoBrt | null,
    emotion: EchoEmotion | null,
    title: string,
  ): Promise<CreateEntryResult> => {
    try {
      const result = await createEntry({
        content,
        goalId,
        aiInsightRequested,
        brt,
        emotion,
        title,
      });

      if (result.entry) prependEntry(result.entry);
      return result;
    } catch (error) {
      return { status: getSubmissionFailureStatus(error) };
    }
  }, [prependEntry]);

  return { goals, saveEntry };
}
