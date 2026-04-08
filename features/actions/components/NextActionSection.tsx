import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import supabase from '@/lib/db/client';
import { useLatestAction } from '../hooks/useLatestAction';
import type { ActionLog } from '../types';

interface NextActionSectionProps {
  goalId: string;
}

async function getAccessToken(): Promise<string> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error('Not authenticated');
  }

  return session.access_token;
}

export function NextActionSection({ goalId }: NextActionSectionProps) {
  const { action, isLoading, isError, mutate } = useLatestAction(goalId);
  const [draftActionText, setDraftActionText] = useState('');
  const [showComposer, setShowComposer] = useState(false);
  const [isMutating, setIsMutating] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [composerError, setComposerError] = useState<string | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [optimisticAction, setOptimisticAction] = useState<ActionLog | null | undefined>(
    undefined,
  );

  const displayedAction = useMemo(
    () => (optimisticAction !== undefined ? optimisticAction : action),
    [action, optimisticAction],
  );
  const showHookError = isError && optimisticAction === undefined;

  useEffect(() => {
    if (action) {
      setDraftActionText('');
      setShowComposer(false);
      setComposerError(null);
    }
  }, [action]);

  async function handleUpdateStatus(status: 'complete' | 'skipped') {
    const currentAction = displayedAction;
    if (!currentAction || isMutating) {
      return;
    }

    setMutationError(null);
    setOptimisticAction(null);
    setIsMutating(true);

    try {
      const accessToken = await getAccessToken();
      const response = await fetch(`/api/actions/${currentAction.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        throw new Error('Failed to update action');
      }
    } catch (error) {
      setOptimisticAction(currentAction);
      setMutationError(
        error instanceof Error ? error.message : 'Failed to update action',
      );
      setIsMutating(false);
      return;
    }

    try {
      await mutate();
      setOptimisticAction(undefined);
    } catch {
      setMutationError('Saved, but failed to refresh.');
    } finally {
      setIsMutating(false);
    }
  }

  async function handleCreateAction() {
    const trimmedActionText = draftActionText.trim();
    if (!trimmedActionText || isCreating) {
      if (!trimmedActionText) {
        setComposerError('Next action cannot be empty.');
      }
      return;
    }

    setComposerError(null);
    setMutationError(null);
    setIsCreating(true);

    try {
      const accessToken = await getAccessToken();
      const response = await fetch('/api/actions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          goal_id: goalId,
          action_text: trimmedActionText,
          status: 'pending',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create action');
      }

      setDraftActionText('');
      setShowComposer(false);

      try {
        await mutate();
      } catch {
        setMutationError('Saved, but failed to refresh.');
      }
    } catch (error) {
      setComposerError(
        error instanceof Error ? error.message : 'Failed to create action',
      );
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <View className="mb-3 rounded-2xl border border-[#EAE7E0] bg-white p-5">
      <Text className="mb-3 font-sans text-[11px] font-medium uppercase tracking-[1.5px] text-[#6B7B6E]">
        Next Action
      </Text>

      {mutationError ? (
        <Text className="mb-3 text-xs text-[#B45309]">{mutationError}</Text>
      ) : null}

      {isLoading && optimisticAction === undefined ? (
        <View className="gap-2">
          <View className="h-4 w-24 rounded-full bg-[#EAE7E0]" />
          <View className="h-4 rounded-full bg-[#F0EDE6]" />
          <View className="h-4 w-3/4 rounded-full bg-[#F0EDE6]" />
        </View>
      ) : null}

      {!isLoading && showHookError ? (
        <View className="rounded-xl border border-[#FDE68A] bg-[#FFFBEB] px-4 py-3">
          <Text className="mb-2 text-sm text-[#92400E]">
            Couldn&apos;t load your next action.
          </Text>
          <TouchableOpacity
            className="self-start rounded-full border border-[#F59E0B] px-3 py-1.5"
            onPress={() => {
              void mutate().catch(() => {});
            }}
          >
            <Text className="text-sm font-medium text-[#92400E]">Retry</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {!isLoading && !showHookError && displayedAction ? (
        <View>
          <Text className="mb-4 font-sans text-base font-medium leading-6 text-[#1A1F1C]">
            {displayedAction.actionText}
          </Text>

          <View className="flex-row gap-3">
            <TouchableOpacity
              className={`flex-1 items-center rounded-full px-4 py-3 ${
                isMutating ? 'bg-[#C9D4CD]' : 'bg-[#3D5247]'
              }`}
              onPress={() => void handleUpdateStatus('complete')}
              disabled={isMutating}
            >
              <Text className="text-sm font-semibold text-white">
                {isMutating ? 'Saving...' : 'Complete'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              className={`flex-1 items-center rounded-full border px-4 py-3 ${
                isMutating
                  ? 'border-[#E5E7EB] bg-[#F7F4EE]'
                  : 'border-[#EAE7E0] bg-[#F8F6F1]'
              }`}
              onPress={() => void handleUpdateStatus('skipped')}
              disabled={isMutating}
            >
              <Text className="text-sm font-medium text-[#6B7B6E]">Skip</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}

      {!isLoading && !showHookError && !displayedAction ? (
        <View>
          {showComposer ? (
            <View className="gap-3">
              <TextInput
                className="rounded-2xl border border-[#EAE7E0] bg-[#F5F1EA] px-4 py-3 text-base text-[#1A1F1C]"
                placeholder="What's the next action?"
                placeholderTextColor="#9CAF9F"
                value={draftActionText}
                onChangeText={setDraftActionText}
                editable={!isCreating}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={() => void handleCreateAction()}
              />

              {composerError ? (
                <Text className="text-xs text-[#DC2626]">{composerError}</Text>
              ) : null}

              <View className="flex-row gap-3">
                <TouchableOpacity
                  className={`flex-1 items-center rounded-full px-4 py-3 ${
                    isCreating ? 'bg-[#C9D4CD]' : 'bg-[#3D5247]'
                  }`}
                  onPress={() => void handleCreateAction()}
                  disabled={isCreating}
                >
                  <Text className="text-sm font-semibold text-white">
                    {isCreating ? 'Saving...' : 'Save'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  className="flex-1 items-center rounded-full border border-[#EAE7E0] bg-[#F8F6F1] px-4 py-3"
                  onPress={() => {
                    setShowComposer(false);
                    setDraftActionText('');
                    setComposerError(null);
                  }}
                  disabled={isCreating}
                >
                  <Text className="text-sm font-medium text-[#6B7B6E]">Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <Pressable
              className="items-start"
              onPress={() => {
                setShowComposer(true);
                setComposerError(null);
                setMutationError(null);
              }}
            >
              <View className="rounded-full bg-[#EEF4F0] px-4 py-2.5">
                <Text className="text-sm font-semibold text-[#3D5247]">
                  Set next action
                </Text>
              </View>
            </Pressable>
          )}
        </View>
      ) : null}

      {(isMutating || isCreating) && !displayedAction ? (
        <View className="mt-3 flex-row items-center gap-2">
          <ActivityIndicator size="small" color="#6B7B6E" />
          <Text className="text-xs text-[#6B7B6E]">
            Syncing your next action...
          </Text>
        </View>
      ) : null}
    </View>
  );
}
