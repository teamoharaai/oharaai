import { useCallback, useEffect, useRef, useState } from 'react';
import { ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useThemeColors } from '@/store/uiStore';
import {
  getEchoDraftContextKey,
  useEchoDraftStore,
  type EchoDraftGoalRef,
} from '../draft-store';
import {
  ENTRY_CONTENT_MAX_LENGTH,
  ENTRY_TITLE_MAX_LENGTH,
  canSubmitEntry,
  isPersistedEntryStatus,
  normalizeEntrySubmission,
  type EchoEntryDraft,
} from '../composer-state';
import type { CreateEntryResult, CreateEntryResultStatus } from '../services/echo-service';
import type { EchoBrt, EchoEmotion, EchoEntry, EchoGoalOption } from '../types';
import { GoalFolderPicker } from './GoalFolderPicker';

type EchoComposerProps = {
  goals: EchoGoalOption[];
  initialGoalId?: string | null;
  onSavingChange?: (isSaving: boolean) => void;
  presentation?: 'pane' | 'modal';
  saveEntry: (
    content: string,
    goalId: string | null,
    aiInsightRequested: boolean,
    brt: EchoBrt | null,
    emotion: EchoEmotion | null,
    title: string,
  ) => Promise<CreateEntryResult>;
  onCancel: () => void;
  onSaved: (entry: EchoEntry | undefined) => void;
};

type SubmissionNoticeKind = Extract<
  CreateEntryResultStatus,
  'saved_without_summary' | 'rate_limited' | 'offline' | 'unconfirmed'
>;

const SUBMISSION_NOTICE_COPY: Record<SubmissionNoticeKind, string> = {
  saved_without_summary: 'Ohara saved your entry. Its response may appear later.',
  rate_limited: "You've reached today's limit. Your entry was saved.",
  offline: "You're offline. Your draft is saved on this device. Submit it when you're back online.",
  unconfirmed:
    "We couldn't confirm your entry was submitted. Your draft is still saved on this device.",
};

function ComposerNotice({ kind }: { kind: SubmissionNoticeKind }) {
  const colors = useThemeColors();
  const tone =
    kind === 'unconfirmed'
      ? colors.feedback.danger
      : kind === 'saved_without_summary'
        ? colors.feedback.info
        : colors.feedback.pending;

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
  onSavingChange,
  presentation = 'pane',
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
  const latestDraftSnapshotRef = useRef({
    contextKey: currentContextKey,
    draft: { title: '', content: '' } satisfies EchoEntryDraft,
  });
  const lastPersistedDraftRef = useRef<{
    contextKey: string;
    draft: EchoEntryDraft;
  } | null>(null);
  const skipContextPersistRef = useRef<string | null>(null);

  const syncLatestDraftSnapshot = useCallback((contextKey: string, draft: EchoEntryDraft) => {
    latestDraftSnapshotRef.current = { contextKey, draft };
  }, []);

  const flushDraft = useCallback((contextKey: string, draft: EchoEntryDraft) => {
    const lastPersisted = lastPersistedDraftRef.current;
    if (
      lastPersisted?.contextKey === contextKey
      && lastPersisted.draft.title === draft.title
      && lastPersisted.draft.content === draft.content
    ) {
      return;
    }

    lastPersistedDraftRef.current = { contextKey, draft };
    setDraft(contextKey, draft);
  }, [setDraft]);

  useEffect(() => {
    syncLatestDraftSnapshot(currentContextKey, { title: titleText, content: text });
  }, [currentContextKey, syncLatestDraftSnapshot, text, titleText]);

  useEffect(() => {
    onSavingChange?.(isSaving);
  }, [isSaving, onSavingChange]);

  useEffect(() => {
    if (!hasHydrated || hasRestoredDraft) return;

    const routeGoal = initialGoalId
      ? goals.find((goal) => goal.id === initialGoalId) ?? { id: initialGoalId, title: '' }
      : null;
    const initialGoal = routeGoal ?? lastLinkedGoal;
    const initialContextKey = getEchoDraftContextKey(initialGoal?.id ?? null);
    const initialDraft = getDraft(initialContextKey);
    previousContextKeyRef.current = initialContextKey;
    syncLatestDraftSnapshot(initialContextKey, initialDraft);
    setLinkedGoal(initialGoal);
    setTitleText(initialDraft.title);
    setText(initialDraft.content);
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
      flushDraft(previousContextKey, latestDraftSnapshotRef.current.draft);
    }

    previousContextKeyRef.current = currentContextKey;
    const nextDraft = getDraft(currentContextKey);
    syncLatestDraftSnapshot(currentContextKey, nextDraft);
    setTitleText(nextDraft.title);
    setText(nextDraft.content);
    setSubmissionNotice(null);
  }, [currentContextKey, flushDraft, getDraft, hasHydrated, hasRestoredDraft, syncLatestDraftSnapshot]);

  useEffect(() => {
    if (!hasHydrated || !hasRestoredDraft) return;
    setLastLinkedGoal(linkedGoal);
  }, [hasHydrated, hasRestoredDraft, linkedGoal, setLastLinkedGoal]);

  useEffect(() => {
    if (!hasHydrated || !hasRestoredDraft) return;

    const timeout = setTimeout(() => {
      flushDraft(currentContextKey, { title: titleText, content: text });
    }, 500);

    return () => clearTimeout(timeout);
  }, [currentContextKey, flushDraft, hasHydrated, hasRestoredDraft, text, titleText]);

  useEffect(() => {
    return () => {
      const snapshot = latestDraftSnapshotRef.current;
      flushDraft(snapshot.contextKey, snapshot.draft);
    };
  }, [flushDraft]);

  function clearSubmissionNotice() {
    setSubmissionNotice(null);
  }

  function handleTextChange(value: string) {
    if (submissionNotice) clearSubmissionNotice();
    syncLatestDraftSnapshot(currentContextKey, { title: titleText, content: value });
    setText(value);
  }

  function handleTitleChange(value: string) {
    if (submissionNotice) clearSubmissionNotice();
    syncLatestDraftSnapshot(currentContextKey, { title: value, content: text });
    setTitleText(value);
  }

  function handleCancel() {
    if (isSaving) return;
    flushDraft(currentContextKey, { title: titleText, content: text });
    onCancel();
  }

  async function handleSave() {
    const draft = { title: titleText, content: text };
    if (!canSubmitEntry(draft, isSaving)) return;

    const activeContextKey = currentContextKey;
    const submission = normalizeEntrySubmission(draft);
    setIsSaving(true);
    clearSubmissionNotice();
    try {
      flushDraft(activeContextKey, submission);

      const result = await saveEntry(
        submission.content,
        linkedGoal?.id ?? null,
        false,
        null,
        null,
        submission.title,
      );

      if (isPersistedEntryStatus(result.status)) {
        skipContextPersistRef.current = activeContextKey;
        const emptyDraft = { title: '', content: '' };
        syncLatestDraftSnapshot(activeContextKey, emptyDraft);
        lastPersistedDraftRef.current = { contextKey: activeContextKey, draft: emptyDraft };
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

  const canSave = canSubmitEntry({ title: titleText, content: text }, isSaving);
  const modalPresentation = presentation === 'modal';

  return (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{
        flexGrow: 1,
        paddingHorizontal: modalPresentation ? 24 : 32,
        paddingVertical: modalPresentation ? 24 : 28,
      }}
      keyboardShouldPersistTaps="handled"
      style={{ minHeight: 0 }}
    >
      <View className="flex-row items-center justify-between gap-4">
        <Text
          className="min-w-0 flex-1 font-sans"
          style={{
            color: colors.text.primary,
            fontFamily: 'Inter-ExtraBold',
            fontSize: 20,
            lineHeight: 26,
          }}
        >
          New Entry
        </Text>
      </View>

      <View className="mt-5">
        {linkedGoal ? (
          <View
            className="rounded-xl border px-3.5 py-3"
            style={{ backgroundColor: colors.background.card, borderColor: colors.border.input }}
          >
            <Text className="font-sans text-xs" style={{ color: colors.text.secondary }}>
              Assigned to:
            </Text>
            <View className="mt-1 flex-row items-center justify-between gap-3">
              <Text
                numberOfLines={1}
                className="min-w-0 flex-1 font-sans"
                style={{
                  color: colors.text.primary,
                  fontFamily: 'Inter-Bold',
                  fontSize: 13.5,
                  lineHeight: 18,
                }}
              >
                {linkedGoal.title || 'Selected goal'}
              </Text>
              <TouchableOpacity onPress={() => setLinkedGoal(null)} activeOpacity={0.7}>
                <Text className="font-sans text-sm" style={{ color: colors.text.secondary }}>
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
            <Text className="font-sans text-sm" style={{ color: colors.text.secondary }}>
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
        className="mt-4 overflow-hidden rounded-xl border"
        style={{
          backgroundColor: colors.background.card,
          borderColor: colors.border.input,
          flex: modalPresentation ? undefined : 1,
          height: modalPresentation ? 300 : undefined,
          minHeight: modalPresentation ? undefined : 320,
        }}
      >
        <TextInput
          className="px-4 pb-3 pt-4 font-sans"
          accessibilityLabel="Entry title"
          maxLength={ENTRY_TITLE_MAX_LENGTH}
          placeholder="Title (required)"
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
          accessibilityLabel="Entry content"
          className="flex-1 px-4 py-4 font-sans text-base"
          maxLength={ENTRY_CONTENT_MAX_LENGTH}
          placeholder="Write your entry..."
          placeholderTextColor="#8A8172"
          multiline
          numberOfLines={18}
          value={text}
          onChangeText={handleTextChange}
          scrollEnabled
          textAlignVertical="top"
          style={{ color: '#211F1A', lineHeight: 22 }}
        />
      </View>

      {submissionNotice ? <ComposerNotice kind={submissionNotice} /> : null}

      <View className="mt-4 flex-row gap-3">
        <TouchableOpacity
          onPress={handleCancel}
          disabled={isSaving}
          className="flex-1 items-center rounded-xl border py-3"
          activeOpacity={0.75}
          style={{ borderColor: colors.border.input, opacity: isSaving ? 0.55 : 1 }}
        >
          <Text
            className="font-sans"
            style={{ color: colors.text.secondary, fontFamily: 'Inter-SemiBold', fontSize: 13.5 }}
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
              color: canSave ? colors.text.inverse : colors.text.secondary,
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
