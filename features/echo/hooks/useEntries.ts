import { useEffect, useState, useCallback, useRef } from 'react';
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
import { startPerformanceTimer, type LoadPhase } from '@/lib/diagnostics/performance';

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
  const hasLoadedRef = useRef(false);
  const [initialLoadStatus, setInitialLoadStatus] = useState<'pending' | 'success' | 'failure'>('pending');

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
      const phase: LoadPhase = hasLoadedRef.current ? 'refresh' : 'initial-load';
      hasLoadedRef.current = true;
      const timing = startPerformanceTimer('entries.load', { phase });
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          timing.end({ success: true, resultCount: 0, requestCount: 1 });
          setInitialLoadStatus('success');
          return;
        }

        setIsLoading(true);
        const [fetchedEntries, containers] = await Promise.all([
          fetchEntries(user.id),
          fetchContainerOptions(user.id),
        ]);
        setEntries(fetchedEntries);
        applyContainerPickerState(containers);
        timing.end({
          success: true,
          resultCount: fetchedEntries.length,
          containerCount: containers.options.length,
          requestCount: 3,
        });
        setInitialLoadStatus('success');
        setIsLoading(false);
      } catch (error) {
        timing.end({ success: false, requestCount: 3 });
        setInitialLoadStatus('failure');
        throw error;
      }
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
    title: string,
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
    initialLoadStatus,
    saveEntry,
    createFolder,
    reloadPickerGoals,
  };
}
