import { useEffect, useState, useCallback } from 'react';
import { useEchoStore } from '../store';
import {
  fetchEntries,
  createEntry,
  createFolderRequest,
  fetchContainerOptions,
  getSubmissionFailureStatus,
  type CreateEntryResult,
} from '../services/echo-service';
import supabase from '@/lib/db/client';
import type { EchoFolder } from '@/types/echo-folder';
import type { EchoBrt, EchoContainerOption, EchoEmotion, EchoGoalOption } from '../types';

type ContainerPickerState = {
  goals: EchoGoalOption[];
  folders: EchoFolder[];
  options: EchoContainerOption[];
};

export function useEntries() {
  const { entries, isLoading, setEntries, prependEntry, setIsLoading } = useEchoStore();
  const [pickerGoals, setPickerGoals] = useState<EchoGoalOption[]>([]);
  const [pickerFolders, setPickerFolders] = useState<EchoFolder[]>([]);
  const [containerOptions, setContainerOptions] = useState<EchoContainerOption[]>([]);

  const applyContainerPickerState = useCallback((containers: ContainerPickerState) => {
    setPickerGoals(containers.goals);
    setPickerFolders(containers.folders);
    setContainerOptions(containers.options);
  }, []);

  const reloadContainers = useCallback(async (): Promise<ContainerPickerState | null> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const containers = await fetchContainerOptions(user.id);
    applyContainerPickerState(containers);
    return containers;
  }, [applyContainerPickerState]);

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
      applyContainerPickerState(containers);
      setIsLoading(false);
    }
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applyContainerPickerState]);

  // Re-fetch container picker options — used when a move target turns out
  // to no longer exist, so a deleted goal/folder drops out of the picker.
  const reloadPickerGoals = useCallback(async () => {
    await reloadContainers();
  }, [reloadContainers]);

  const createFolder = useCallback(async (name: string): Promise<EchoFolder> => {
    const folder = await createFolderRequest(name);
    await reloadContainers();
    return folder;
  }, [reloadContainers]);

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

  return {
    entries,
    isLoading,
    pickerGoals,
    pickerFolders,
    containerOptions,
    saveEntry,
    createFolder,
    reloadPickerGoals,
  };
}
