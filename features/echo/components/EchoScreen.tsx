import { useCallback, useEffect, useRef, useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { FEATURES } from '@/constants/features';
import { EmptyStateCard } from '@/components/ui/EmptyStateCard';
import {
  getEchoDraftContextKey,
  useEchoDraftStore,
  type EchoDraftGoalRef,
} from '../draft-store';
import { useEntries } from '../hooks/useEntries';
import type { CreateEntryResultStatus } from '../services/echo-service';
import type { EchoEntry } from '../types';

function formatPillLabel(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatHeaderDate(date: Date): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const months = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];
  return `${days[date.getDay()]}, ${months[date.getMonth()]} ${date.getDate()}`;
}

function formatRelativeTime(date: Date): string {
  const seconds = Math.max(1, Math.floor((Date.now() - date.getTime()) / 1000));
  const ranges = [
    { limit: 60, unit: 'second' },
    { limit: 3600, unit: 'minute', divisor: 60 },
    { limit: 86400, unit: 'hour', divisor: 3600 },
    { limit: 604800, unit: 'day', divisor: 86400 },
    { limit: 2629800, unit: 'week', divisor: 604800 },
    { limit: 31557600, unit: 'month', divisor: 2629800 },
  ] as const;

  for (const range of ranges) {
    if (seconds < range.limit) {
      const value = 'divisor' in range ? Math.floor(seconds / range.divisor) : seconds;
      return `${value} ${range.unit}${value === 1 ? '' : 's'} ago`;
    }
  }

  const years = Math.floor(seconds / 31557600);
  return `${years} year${years === 1 ? '' : 's'} ago`;
}

function SectionLabel({ children }: { children: string }) {
  return (
    <Text className="mb-2.5 font-sans text-xs font-semibold uppercase tracking-[1.2px] text-[#6B7280]">
      {children}
    </Text>
  );
}

function EchoEntryListCard({ entry }: { entry: EchoEntry }) {
  const onPress = () => router.push(`/(app)/echo/${entry.id}` as never);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
    >
      <View className="mb-3 rounded-xl bg-white p-4 shadow-sm">
        <Text className="font-sans text-sm leading-[21px] text-[#1C1C1E]" numberOfLines={2}>
          {entry.content}
        </Text>

        <View className="mt-3 flex-row items-center gap-2">
          <Text className="font-sans text-xs text-[#6B7280]">{formatRelativeTime(entry.createdAt)}</Text>
          {entry.emotion?.primary ? (
            <View className="rounded-full bg-[#EEF2EF] px-2 py-1">
              <Text className="font-sans text-[11px] font-medium text-[#3D5247]">
                {formatPillLabel(entry.emotion.primary)}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

function EchoLoadingState() {
  return (
    <View className="gap-3 py-2">
      {[0, 1, 2].map((item) => (
        <View key={item} className="rounded-xl bg-white p-4 shadow-sm">
          <View className="mb-3 h-3.5 rounded-full bg-[#EAE7E0]" />
          <View className="mb-2 h-3.5 w-[83%] rounded-full bg-[#EAE7E0]" />
          <View className="mb-4 h-3.5 w-[66%] rounded-full bg-[#EAE7E0]" />
          <View className="h-3 w-20 rounded-full bg-[#EAE7E0]" />
        </View>
      ))}
    </View>
  );
}

type SubmissionNoticeKind = Extract<
  CreateEntryResultStatus,
  'saved_without_summary' | 'rate_limited' | 'offline' | 'unconfirmed'
>;

const SUBMISSION_NOTICE_COPY: Record<SubmissionNoticeKind, string> = {
  saved_without_summary: 'Ohara saved your reflection. Its response may appear later.',
  rate_limited: "You've reached today's limit. Your reflections are still saved locally.",
  offline: "You're offline. Your draft is saved on this device. Submit it when you're back online.",
  unconfirmed:
    "We couldn't confirm your reflection was submitted. Your draft is still saved on this device.",
};

function ComposerNotice({ kind }: { kind: SubmissionNoticeKind }) {
  const toneClasses = {
    saved_without_summary: {
      container: 'border-[#D8D2C8] bg-[#F8F5EF]',
      text: 'text-[#5F6B66]',
    },
    rate_limited: {
      container: 'border-amber-200 bg-amber-50',
      text: 'text-amber-800',
    },
    offline: {
      container: 'border-amber-200 bg-amber-50',
      text: 'text-amber-800',
    },
    unconfirmed: {
      container: 'border-red-200 bg-red-50',
      text: 'text-red-700',
    },
  } as const;

  return (
    <View className={`mt-3 rounded-xl border px-4 py-3 ${toneClasses[kind].container}`}>
      <Text className={`font-sans text-sm leading-5 ${toneClasses[kind].text}`}>
        {SUBMISSION_NOTICE_COPY[kind]}
      </Text>
    </View>
  );
}

export function EchoScreen() {
  const { goalId: routeGoalIdParam } = useLocalSearchParams<{ goalId?: string | string[] }>();
  const routeGoalId = Array.isArray(routeGoalIdParam) ? routeGoalIdParam[0] : routeGoalIdParam;
  const { entries, isLoading, pickerGoals, saveEntry } = useEntries();
  const hasHydrated = useEchoDraftStore((state) => state.hasHydrated);
  const getDraft = useEchoDraftStore((state) => state.getDraft);
  const setDraft = useEchoDraftStore((state) => state.setDraft);
  const clearDraft = useEchoDraftStore((state) => state.clearDraft);
  const lastLinkedGoal = useEchoDraftStore((state) => state.lastLinkedGoal);
  const setLastLinkedGoal = useEchoDraftStore((state) => state.setLastLinkedGoal);

  const [text, setText] = useState('');
  const [titleText, setTitleText] = useState('');
  const [linkedGoal, setLinkedGoal] = useState<EchoDraftGoalRef | null>(null);
  const [aiInsightOn, setAiInsightOn] = useState(false);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isComposerFocused, setIsComposerFocused] = useState(false);
  const [submissionNotice, setSubmissionNotice] = useState<SubmissionNoticeKind | null>(null);
  const [hasRestoredDraft, setHasRestoredDraft] = useState(false);
  const currentContextKey = getEchoDraftContextKey(linkedGoal?.id ?? null);
  const previousContextKeyRef = useRef(currentContextKey);
  const latestDraftSnapshotRef = useRef({ contextKey: currentContextKey, text: '' });
  const lastPersistedDraftRef = useRef<{ contextKey: string; text: string } | null>(null);
  const skipContextPersistRef = useRef<string | null>(null);

  const syncLatestDraftSnapshot = useCallback((contextKey: string, nextText: string) => {
    latestDraftSnapshotRef.current = { contextKey, text: nextText };
  }, []);

  const flushDraft = useCallback((contextKey: string, nextText: string) => {
    const lastPersisted = lastPersistedDraftRef.current;
    if (lastPersisted?.contextKey === contextKey && lastPersisted.text === nextText) {
      return;
    }

    lastPersistedDraftRef.current = { contextKey, text: nextText };
    setDraft(contextKey, nextText);
  }, [setDraft]);

  useEffect(() => {
    syncLatestDraftSnapshot(currentContextKey, text);
  }, [currentContextKey, syncLatestDraftSnapshot, text]);

  useEffect(() => {
    if (!hasHydrated || hasRestoredDraft) return;

    const routeGoal = routeGoalId
      ? pickerGoals.find((goal) => goal.id === routeGoalId) ?? { id: routeGoalId, title: '' }
      : null;
    const initialGoal = routeGoal ?? lastLinkedGoal;
    const initialContextKey = getEchoDraftContextKey(initialGoal?.id ?? null);
    const initialDraftText = getDraft(initialContextKey);
    previousContextKeyRef.current = initialContextKey;
    syncLatestDraftSnapshot(initialContextKey, initialDraftText);
    setLinkedGoal(initialGoal);
    setText(initialDraftText);
    setHasRestoredDraft(true);
  }, [getDraft, hasHydrated, hasRestoredDraft, lastLinkedGoal, pickerGoals, routeGoalId, syncLatestDraftSnapshot]);

  useEffect(() => {
    if (!linkedGoal || !pickerGoals.length) return;

    const latestGoal = pickerGoals.find((goal) => goal.id === linkedGoal.id);
    if (!latestGoal || latestGoal.title === linkedGoal.title) return;

    setLinkedGoal(latestGoal);
    setLastLinkedGoal(latestGoal);
  }, [linkedGoal, pickerGoals, setLastLinkedGoal]);

  useEffect(() => {
    if (!hasHydrated || !hasRestoredDraft) return;

    const previousContextKey = previousContextKeyRef.current;
    if (previousContextKey === currentContextKey) return;

    if (skipContextPersistRef.current === previousContextKey) {
      skipContextPersistRef.current = null;
    } else {
      flushDraft(previousContextKey, latestDraftSnapshotRef.current.text);
    }

    previousContextKeyRef.current = currentContextKey;
    const nextDraftText = getDraft(currentContextKey);
    syncLatestDraftSnapshot(currentContextKey, nextDraftText);
    setText(nextDraftText);
    setSubmissionNotice(null);
  }, [currentContextKey, flushDraft, getDraft, hasHydrated, hasRestoredDraft, syncLatestDraftSnapshot]);

  useEffect(() => {
    if (!hasHydrated || !hasRestoredDraft) return;
    setLastLinkedGoal(linkedGoal);
  }, [hasHydrated, hasRestoredDraft, linkedGoal, setLastLinkedGoal]);

  useEffect(() => {
    if (!hasHydrated || !hasRestoredDraft) return;

    const timeout = setTimeout(() => {
      flushDraft(currentContextKey, text);
    }, 500);

    return () => clearTimeout(timeout);
  }, [currentContextKey, flushDraft, hasHydrated, hasRestoredDraft, text]);

  useEffect(() => {
    return () => {
      const snapshot = latestDraftSnapshotRef.current;
      flushDraft(snapshot.contextKey, snapshot.text);
    };
  }, [flushDraft]);

  function clearSubmissionNotice() {
    setSubmissionNotice(null);
  }

  function handleTitleChange(value: string) {
    if (submissionNotice) {
      clearSubmissionNotice();
    }
    setTitleText(value);
  }

  function handleTextChange(value: string) {
    if (submissionNotice) {
      clearSubmissionNotice();
    }
    syncLatestDraftSnapshot(currentContextKey, value);
    setText(value);
  }

  async function handleSave() {
    const trimmedText = text.trim();
    if (!trimmedText || isSaving) return;

    const activeContextKey = currentContextKey;
    setIsSaving(true);
    clearSubmissionNotice();
    try {
      flushDraft(activeContextKey, trimmedText);

      const aiRequested = FEATURES.INTELLIGENCE_ENABLED ? aiInsightOn : false;
      const trimmedTitle = titleText.trim() || null;
      const result = await saveEntry(trimmedText, linkedGoal?.id ?? null, aiRequested, null, null, trimmedTitle);

      if (result.status === 'saved') {
        skipContextPersistRef.current = activeContextKey;
        syncLatestDraftSnapshot(activeContextKey, '');
        lastPersistedDraftRef.current = { contextKey: activeContextKey, text: '' };
        clearSubmissionNotice();
        clearDraft(activeContextKey);
        setText('');
        setTitleText('');
        setLinkedGoal(null);
        setAiInsightOn(false);
      } else if (result.status === 'saved_without_summary' || result.status === 'rate_limited') {
        skipContextPersistRef.current = activeContextKey;
        syncLatestDraftSnapshot(activeContextKey, '');
        lastPersistedDraftRef.current = { contextKey: activeContextKey, text: '' };
        clearDraft(activeContextKey);
        setText('');
        setTitleText('');
        setLinkedGoal(null);
        setAiInsightOn(false);
        setSubmissionNotice(result.status);
      } else {
        setSubmissionNotice(result.status);
      }
    } finally {
      setIsSaving(false);
    }
  }

  const today = new Date();
  const canSave = text.trim().length > 0 && !isSaving;

  return (
    <SafeAreaView className="flex-1 bg-[#F5F1EA]">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40, paddingTop: 16 }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="mb-6">
          <Text className="font-sans text-2xl font-extrabold text-[#1C1C1E]">Echo</Text>
          <Text className="mt-0.5 font-sans text-sm text-[#6B7280]">
            {formatHeaderDate(today)}
          </Text>
        </View>

        <View
          className={`mb-6 rounded-xl border bg-white p-4 shadow-sm ${
            isComposerFocused ? 'border-[#3D5247]' : 'border-[#D8D2C8]'
          }`}
        >
          <SectionLabel>Reflection</SectionLabel>
          <TextInput
            className="mb-2.5 rounded-xl border border-[#D8D2C8] bg-white px-3.5 py-3 font-sans text-base text-[#1C1C1E]"
            placeholder="Title (optional)"
            placeholderTextColor="#6B7280"
            value={titleText}
            onChangeText={handleTitleChange}
          />
          <TextInput
            className={`min-h-[100px] rounded-xl border bg-white px-3.5 py-3 font-sans text-base text-[#1C1C1E] ${
              isComposerFocused ? 'border-[#3D5247]' : 'border-[#D8D2C8]'
            }`}
            placeholder="What's on your mind?"
            placeholderTextColor="#6B7280"
            multiline
            value={text}
            onChangeText={handleTextChange}
            onFocus={() => setIsComposerFocused(true)}
            onBlur={() => setIsComposerFocused(false)}
            textAlignVertical="top"
          />

          <View className="mt-3.5 flex-row flex-wrap items-center gap-2">
            {linkedGoal ? (
              <TouchableOpacity
                onPress={() => setLinkedGoal(null)}
                className="flex-row items-center gap-1.5 rounded-full bg-[#EEF2EF] px-3 py-1.5"
                activeOpacity={0.7}
              >
                <Text className="font-sans text-xs text-[#3D5247]">{linkedGoal.title}</Text>
                <Text className="font-sans text-sm leading-4 text-[#3D5247]">×</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={() => setPickerVisible(true)}
                className="flex-row items-center rounded-full border border-[#D8D2C8] px-3 py-1.5"
                activeOpacity={0.7}
              >
                <Text className="font-sans text-xs text-[#6B7280]">+ Link goal</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              onPress={() => setAiInsightOn((value) => !value)}
              className={`rounded-full px-3 py-1.5 ${
                aiInsightOn ? 'bg-[#3D5247]' : 'bg-[#F5F1EA]'
              }`}
              activeOpacity={0.7}
            >
              <Text className={`font-sans text-xs ${aiInsightOn ? 'text-white' : 'text-[#6B7280]'}`}>
                AI insight
              </Text>
            </TouchableOpacity>
          </View>

          {aiInsightOn ? (
            <Text className="mt-2 font-sans text-[11px] text-[#6B7280]">
              Ohara AI will reflect on this entry
            </Text>
          ) : null}

          {submissionNotice ? <ComposerNotice kind={submissionNotice} /> : null}

          <TouchableOpacity
            onPress={handleSave}
            disabled={!canSave}
            className={`mt-4 items-center rounded-xl py-3 ${
              canSave ? 'bg-[#3D5247]' : 'bg-[#D8D2C8]'
            }`}
            activeOpacity={0.8}
          >
            <Text className={`font-sans text-sm font-semibold ${canSave ? 'text-white' : 'text-[#6B7280]'}`}>
              {isSaving ? 'Saving...' : 'Save Entry'}
            </Text>
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <EchoLoadingState />
        ) : entries.length === 0 ? (
          <View className="pt-2">
            <EmptyStateCard
              title="No Echo entries yet."
              description="Write your first reflection above to start building your Echo."
            />
          </View>
        ) : (
          entries.map((entry) => (
            <EchoEntryListCard key={entry.id} entry={entry} />
          ))
        )}
      </ScrollView>

      <Modal
        visible={pickerVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setPickerVisible(false)}
      >
        <Pressable
          className="flex-1 justify-end bg-black/40"
          onPress={() => setPickerVisible(false)}
        >
          <Pressable
            className="max-h-[60%] rounded-t-2xl border-t border-[#D8D2C8] bg-white pb-10 pt-3"
          >
            <View className="mb-4 h-1 w-9 self-center rounded-full bg-[#D8D2C8]" />
            <Text className="mb-3 px-5 font-sans text-base font-bold text-[#1C1C1E]">Link a goal</Text>
            {pickerGoals.length === 0 ? (
              <Text className="px-5 font-sans text-sm text-[#6B7280]">
                No active goals found.
              </Text>
            ) : (
              <FlatList
                data={pickerGoals}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    onPress={() => {
                      setLinkedGoal(item);
                      setPickerVisible(false);
                    }}
                    className="border-b border-[#D8D2C8] px-5 py-3.5"
                    activeOpacity={0.7}
                  >
                    <Text className="font-sans text-base text-[#1C1C1E]">{item.title}</Text>
                  </TouchableOpacity>
                )}
              />
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
