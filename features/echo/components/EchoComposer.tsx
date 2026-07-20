import { useCallback, useEffect, useRef, useState } from 'react';
import { ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useThemeColors } from '@/store/uiStore';
import {
  getEchoDraftContextKey,
  useEchoDraftStore,
  type EchoDraftGoalRef,
} from '../draft-store';
import type { CreateEntryResult, CreateEntryResultStatus } from '../services/echo-service';
import type { EchoBrt, EchoEmotion, EchoEntry, EchoGoalOption } from '../types';
import { GoalFolderPicker } from './GoalFolderPicker';

type EchoComposerProps = {
  goals: EchoGoalOption[];
  initialGoalId?: string | null;
  saveEntry: (
    content: string,
    goalId: string | null,
    aiInsightRequested: boolean,
    brt: EchoBrt | null,
    emotion: EchoEmotion | null,
    title: string | null,
  ) => Promise<CreateEntryResult>;
  onCancel: () => void;
  onSaved: (entry: EchoEntry | undefined) => void;
};

type SubmissionNoticeKind = Extract<
  CreateEntryResultStatus,
  'saved_without_summary' | 'rate_limited' | 'offline' | 'unconfirmed'
>;

const SUBMISSION_NOTICE_COPY: Record<SubmissionNoticeKind, string> = {
  saved_without_summary: 'Ohara saved your reflection. Its response may appear later.',
  rate_limited: "You've reached today's limit. Your reflection was saved.",
  offline: "You're offline. Your draft is saved on this device. Submit it when you're back online.",
  unconfirmed:
    "We couldn't confirm your reflection was submitted. Your draft is still saved on this device.",
};

function ComposerNotice({ kind }: { kind: SubmissionNoticeKind }) {
  const colors = useThemeColors();
  const tone =
    kind === 'unconfirmed'
      ? { border: '#FCA5A5', bg: '#FEF2F2', text: '#B91C1C' }
      : kind === 'saved_without_summary'
        ? { border: colors.border.input, bg: '#F8F5EF', text: '#5F6B66' }
        : {
            border: colors.feedback.pending.border,
            bg: colors.feedback.pending.bg,
            text: '#92400E',
          };

  return (
    <View
      className="mt-3 rounded-xl border px-4 py-3"
      style={{ backgroundColor: tone.bg, borderColor: tone.border }}
    >
      <Text className="font-sans text-sm leading-5" style={{ color: tone.text }}>
        {SUBMISSION_NOTICE_COPY[kind]}
      </Text>
    </View>
  );
}

export function EchoComposer({
  goals,
  initialGoalId,
  saveEntry,
  onCancel,
  onSaved,
}: EchoComposerProps) {
  const colors = useThemeColors();
  const hasHydrated = useEchoDraftStore((state) => state.hasHydrated);
  const getDraft = useEchoDraftStore((state) => state.getDraft);
  const setDraft = useEchoDraftStore((state) => state.setDraft);
  const clearDraft = useEchoDraftStore((state) => state.clearDraft);
  const lastLinkedGoal = useEchoDraftStore((state) => state.lastLinkedGoal);
  const setLastLinkedGoal = useEchoDraftStore((state) => state.setLastLinkedGoal);

  const [text, setText] = useState('');
  const [titleText, setTitleText] = useState('');
  const [linkedGoal, setLinkedGoal] = useState<EchoDraftGoalRef | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
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

    const routeGoal = initialGoalId
      ? goals.find((goal) => goal.id === initialGoalId) ?? { id: initialGoalId, title: '' }
      : null;
    const initialGoal = routeGoal ?? lastLinkedGoal;
    const initialContextKey = getEchoDraftContextKey(initialGoal?.id ?? null);
    const initialDraftText = getDraft(initialContextKey);
    previousContextKeyRef.current = initialContextKey;
    syncLatestDraftSnapshot(initialContextKey, initialDraftText);
    setLinkedGoal(initialGoal);
    setText(initialDraftText);
    setHasRestoredDraft(true);
  }, [getDraft, goals, hasHydrated, hasRestoredDraft, initialGoalId, lastLinkedGoal, syncLatestDraftSnapshot]);

  useEffect(() => {
    if (!linkedGoal || !goals.length) return;

    const latestGoal = goals.find((goal) => goal.id === linkedGoal.id);
    if (!latestGoal || latestGoal.title === linkedGoal.title) return;

    const nextGoal = { id: latestGoal.id, title: latestGoal.title };
    setLinkedGoal(nextGoal);
    setLastLinkedGoal(nextGoal);
  }, [goals, linkedGoal, setLastLinkedGoal]);

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

  function handleTextChange(value: string) {
    if (submissionNotice) clearSubmissionNotice();
    syncLatestDraftSnapshot(currentContextKey, value);
    setText(value);
  }

  function handleTitleChange(value: string) {
    if (submissionNotice) clearSubmissionNotice();
    setTitleText(value);
  }

  function handleCancel() {
    flushDraft(currentContextKey, text);
    onCancel();
  }

  async function handleSave() {
    const trimmedText = text.trim();
    if (!trimmedText || isSaving) return;

    const activeContextKey = currentContextKey;
    setIsSaving(true);
    clearSubmissionNotice();
    try {
      flushDraft(activeContextKey, trimmedText);

      const trimmedTitle = titleText.trim() || null;
      const result = await saveEntry(trimmedText, linkedGoal?.id ?? null, false, null, null, trimmedTitle);

      if (
        result.status === 'saved' ||
        result.status === 'saved_without_summary' ||
        result.status === 'rate_limited'
      ) {
        skipContextPersistRef.current = activeContextKey;
        syncLatestDraftSnapshot(activeContextKey, '');
        lastPersistedDraftRef.current = { contextKey: activeContextKey, text: '' };
        clearDraft(activeContextKey);
        setText('');
        setTitleText('');
        setLinkedGoal(null);
        setPickerOpen(false);
        if (result.status !== 'saved') setSubmissionNotice(result.status);
        onSaved(result.entry);
        return;
      }

      setSubmissionNotice(result.status);
    } finally {
      setIsSaving(false);
    }
  }

  const canSave = text.trim().length > 0 && !isSaving;

  return (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 32, paddingVertical: 28 }}
      keyboardShouldPersistTaps="handled"
      style={{ minHeight: 0 }}
    >
      <View className="flex-row items-center justify-between gap-4">
        <Text
          className="min-w-0 flex-1 font-sans"
          style={{
            color: '#211F1A',
            fontFamily: 'Inter-ExtraBold',
            fontSize: 20,
            lineHeight: 26,
          }}
        >
          New Echo
        </Text>
      </View>

      <View className="mt-5">
        {linkedGoal ? (
          <View
            className="rounded-xl border px-3.5 py-3"
            style={{ backgroundColor: colors.background.card, borderColor: colors.border.input }}
          >
            <Text className="font-sans text-xs" style={{ color: '#8A8172' }}>
              Assigned to:
            </Text>
            <View className="mt-1 flex-row items-center justify-between gap-3">
              <Text
                numberOfLines={1}
                className="min-w-0 flex-1 font-sans"
                style={{
                  color: '#211F1A',
                  fontFamily: 'Inter-Bold',
                  fontSize: 13.5,
                  lineHeight: 18,
                }}
              >
                {linkedGoal.title || 'Selected goal'}
              </Text>
              <TouchableOpacity onPress={() => setLinkedGoal(null)} activeOpacity={0.7}>
                <Text className="font-sans text-sm" style={{ color: '#8A8172' }}>
                  Clear
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <TouchableOpacity
            onPress={() => setPickerOpen((value) => !value)}
            className="rounded-xl border px-3.5 py-3"
            style={{ backgroundColor: colors.background.card, borderColor: colors.border.input }}
            activeOpacity={0.75}
          >
            <Text className="font-sans text-sm" style={{ color: '#8A8172' }}>
              Link a goal
            </Text>
          </TouchableOpacity>
        )}

        {pickerOpen ? (
          <View
            className="mt-2 rounded-xl border py-1"
            style={{ backgroundColor: colors.background.card, borderColor: colors.border.divider }}
          >
            <GoalFolderPicker
              goals={goals}
              folders={[]}
              selected={linkedGoal ? { type: 'goal', id: linkedGoal.id } : null}
              maxHeight={220}
              showFolders={false}
              onSelect={(value) => {
                if (value.type !== 'goal') return;
                setLinkedGoal({ id: value.id, title: value.displayName });
                setPickerOpen(false);
              }}
            />
          </View>
        ) : null}
      </View>

      <View
        className="mt-4 min-h-[320px] flex-1 overflow-hidden rounded-xl border"
        style={{ backgroundColor: colors.background.card, borderColor: colors.border.input }}
      >
        <TextInput
          className="px-4 pb-3 pt-4 font-sans"
          placeholder="Title (optional)"
          placeholderTextColor="#8A8172"
          value={titleText}
          onChangeText={handleTitleChange}
          style={{
            borderBottomColor: colors.border.divider,
            borderBottomWidth: 1,
            color: '#211F1A',
            fontFamily: 'Inter-ExtraBold',
            fontSize: 22,
            lineHeight: 28,
          }}
        />

        <TextInput
          className="flex-1 px-4 py-4 font-sans text-base"
          placeholder="What's on your mind?"
          placeholderTextColor="#8A8172"
          multiline
          numberOfLines={18}
          value={text}
          onChangeText={handleTextChange}
          textAlignVertical="top"
          style={{ color: '#211F1A', lineHeight: 22 }}
        />
      </View>

      {submissionNotice ? <ComposerNotice kind={submissionNotice} /> : null}

      <View className="mt-4 flex-row gap-3">
        <TouchableOpacity
          onPress={handleCancel}
          className="flex-1 items-center rounded-xl border py-3"
          style={{ borderColor: colors.border.input }}
          activeOpacity={0.75}
        >
          <Text
            className="font-sans"
            style={{ color: '#8A8172', fontFamily: 'Inter-SemiBold', fontSize: 13.5 }}
          >
            Cancel
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleSave}
          disabled={!canSave}
          className="flex-1 items-center rounded-xl py-3"
          style={{ backgroundColor: canSave ? colors.background.sidebar : colors.border.input }}
          activeOpacity={0.82}
        >
          <Text
            className="font-sans"
            style={{
              color: canSave ? '#EDE7DA' : '#8A8172',
              fontFamily: 'Inter-SemiBold',
              fontSize: 13.5,
            }}
          >
            {isSaving ? 'Saving...' : 'Save entry'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
