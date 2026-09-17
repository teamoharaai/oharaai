import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, TextInput, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Typography } from '@/components/ui/Typography';
import { FONT, RADIUS, SPACE, TYPE } from '@/constants/design';
import { useProjectStore } from '@/features/projects/store';
import { useThemeColors } from '@/store/uiStore';
import { copyEntryText, exportEntryPdf, exportEntryText } from '../export';
import { isPersistenceUnavailable } from '../services/entry-service';
import { useEntriesStore } from '../store';
import type { EntryDraft, EntryRecord, EntrySaveStatus, RichTextDocument } from '../types';
import { EntryLinkPicker } from './EntryLinkPicker';

const AUTOSAVE_DELAY = 900;

function reflectionDocument(text: string): RichTextDocument {
  const lines = text.split('\n');
  return {
    type: 'doc',
    schemaVersion: 2,
    content: lines.map((line, index) => ({
      type: 'paragraph',
      attrs: { id: `reflection-line-${index}` },
      ...(line ? { content: [{ type: 'text', text: line }] } : {}),
    })),
  };
}

function saveLabel(status: EntrySaveStatus): string {
  if (status === 'saving') return 'Saving…';
  if (status === 'error') return "Couldn't save — Retry";
  if (status === 'idle') return 'Unsaved changes';
  return 'Saved';
}

function localDraftKey(entryId: string): string {
  return `ohara-quick-reflection-draft:${entryId}`;
}

export function QuickReflectionEditor({
  entry: initialEntry,
  onBack,
  showBack,
}: {
  entry: EntryRecord;
  onBack: () => void;
  showBack: boolean;
}) {
  const colors = useThemeColors();
  const { width } = useWindowDimensions();
  const compact = width < 720;
  const activeGoalOptions = useEntriesStore((state) => state.goals);
  const updateEntry = useEntriesStore((state) => state.updateEntry);
  const deleteEntry = useEntriesStore((state) => state.deleteEntry);
  const loadContext = useEntriesStore((state) => state.loadContext);
  const projects = useProjectStore((state) => state.projects);
  const loadProjects = useProjectStore((state) => state.loadProjects);
  const [entry, setEntry] = useState(initialEntry);
  const [title, setTitle] = useState(initialEntry.title);
  const [body, setBody] = useState(initialEntry.plainText);
  const [goalIds, setGoalIds] = useState(initialEntry.goals.map((goal) => goal.id));
  const [categoryIds, setCategoryIds] = useState(initialEntry.categoryIds);
  const [projectId, setProjectId] = useState(initialEntry.project?.id ?? null);
  const [saveStatus, setSaveStatus] = useState<EntrySaveStatus>('saved');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [dirtyVersion, setDirtyVersion] = useState(0);
  const [linkPickerOpen, setLinkPickerOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [exportMessage, setExportMessage] = useState<string | null>(null);
  const lastSavedVersion = useRef(0);
  const lastAttemptedVersion = useRef(0);
  const savingRef = useRef(false);
  const latestDraftRef = useRef<EntryDraft | null>(null);
  const goals = useMemo(() => {
    const options = new Map(activeGoalOptions.map((goal) => [goal.id, goal]));
    for (const linkedGoal of entry.goals) {
      if (!options.has(linkedGoal.id)) {
        options.set(linkedGoal.id, {
          ...linkedGoal,
          milestones: entry.milestones.filter((milestone) => milestone.goalId === linkedGoal.id),
        });
      }
    }
    return [...options.values()];
  }, [activeGoalOptions, entry.goals, entry.milestones]);

  useEffect(() => {
    void loadContext();
    void loadProjects();
  }, [loadContext, loadProjects]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = window.localStorage.getItem(localDraftKey(entry.id));
    if (!stored) return;
    try {
      const draft = JSON.parse(stored) as EntryDraft;
      setTitle(draft.title);
      setBody(draft.plainText);
      setGoalIds(draft.relationships.goalIds);
      setCategoryIds(draft.relationships.categoryIds);
      setProjectId(draft.relationships.projectId ?? null);
      setSaveStatus('error');
      setSaveError('Recovered an unsaved reflection from this device.');
      setDirtyVersion((version) => version + 1);
    } catch {
      window.localStorage.removeItem(localDraftKey(entry.id));
    }
  }, [entry.id]);

  const draft = useMemo<EntryDraft>(() => ({
    entryType: 'reflection',
    title,
    content: reflectionDocument(body),
    plainText: body,
    reflectionType: 'open',
    conversationTurns: [],
    takeaway: null,
    completedAt: null,
    expectedContentVersion: entry.contentVersion,
    relationships: {
      goalIds,
      projectId,
      categoryIds,
      milestoneIds: [],
    },
  }), [body, categoryIds, entry.contentVersion, goalIds, projectId, title]);
  latestDraftRef.current = draft;

  useEffect(() => {
    if (typeof window === 'undefined' || dirtyVersion <= lastSavedVersion.current) return;
    window.localStorage.setItem(localDraftKey(entry.id), JSON.stringify(draft));
  }, [dirtyVersion, draft, entry.id]);

  const persist = useCallback(async (version: number): Promise<boolean> => {
    if (version <= lastSavedVersion.current) return true;
    if (savingRef.current) return false;
    savingRef.current = true;
    lastAttemptedVersion.current = version;
    setSaveStatus('saving');
    setSaveError(null);
    try {
      const saved = await updateEntry(entry.id, latestDraftRef.current as EntryDraft);
      setEntry(saved);
      lastSavedVersion.current = version;
      setSaveStatus('saved');
      if (typeof window !== 'undefined') window.localStorage.removeItem(localDraftKey(entry.id));
      return true;
    } catch (error) {
      setSaveStatus('error');
      const localDraftAvailable = typeof window !== 'undefined';
      setSaveError(isPersistenceUnavailable(error)
        ? localDraftAvailable
          ? 'You appear to be offline. This reflection is kept on this device.'
          : 'You appear to be offline. Stay here and retry so your reflection is not lost.'
        : error instanceof Error ? error.message : 'Autosave failed. Your reflection is still here.');
      return false;
    } finally {
      savingRef.current = false;
    }
  }, [entry.id, updateEntry]);

  useEffect(() => {
    if (
      dirtyVersion === 0
      || dirtyVersion <= lastSavedVersion.current
      || dirtyVersion <= lastAttemptedVersion.current
    ) return;
    const timer = setTimeout(() => void persist(dirtyVersion), AUTOSAVE_DELAY);
    return () => clearTimeout(timer);
  }, [dirtyVersion, persist, saveStatus]);

  function markDirty() {
    setDirtyVersion((version) => version + 1);
    setSaveStatus('idle');
  }

  async function leave() {
    if (dirtyVersion > lastSavedVersion.current) {
      const saved = await persist(dirtyVersion);
      if (!saved) return;
    }
    onBack();
  }

  async function remove() {
    try {
      await deleteEntry(entry.id);
      setDeleteOpen(false);
      onBack();
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Could not delete reflection');
    }
  }

  async function exportAction(action: 'pdf' | 'text' | 'copy') {
    setExportMessage(null);
    try {
      if (action === 'pdf') await exportEntryPdf(title, body, { document: draft.content, goals: entry.goals });
      if (action === 'text') exportEntryText(title, body);
      if (action === 'copy') await copyEntryText(title, body);
      setExportMessage(action === 'copy' ? 'Copied to clipboard.' : 'Export started.');
    } catch (error) {
      setExportMessage(error instanceof Error ? error.message : 'Export failed');
    }
  }

  const selectedGoals = goals.filter((goal) => goalIds.includes(goal.id));
  const selectedProject = projects.find((project) => project.id === projectId) ?? null;

  return (
    <View style={{ backgroundColor: colors.background.card, flex: 1, minHeight: 0 }}>
      <View
        style={{
          alignItems: 'center',
          borderBottomColor: colors.border.divider,
          borderBottomWidth: 1,
          flexDirection: 'row',
          gap: SPACE.md,
          minHeight: 64,
          paddingHorizontal: compact ? SPACE.lg : SPACE['2xl'],
        }}
      >
        {showBack ? (
          <Pressable
            accessibilityHint="Saves changes before returning"
            accessibilityLabel="Back to Echo library"
            accessibilityRole="button"
            hitSlop={8}
            onPress={() => void leave()}
            style={{ alignItems: 'center', height: 44, justifyContent: 'center', width: 44 }}
          >
            <Ionicons name="arrow-back" color={colors.text.primary} size={22} />
          </Pressable>
        ) : null}
        <View style={{ flex: 1, minWidth: 0 }}>
          <Typography variant="nav-title" numberOfLines={1}>Quick Reflection</Typography>
          <Pressable
            accessibilityLabel={saveLabel(saveStatus)}
            accessibilityLiveRegion="polite"
            accessibilityRole={saveStatus === 'error' ? 'button' : 'text'}
            disabled={saveStatus !== 'error'}
            onPress={() => saveStatus === 'error' && void persist(dirtyVersion)}
          >
            <Typography
              variant="caption"
              style={{ color: saveStatus === 'error' ? colors.feedback.danger.text : colors.text.muted }}
            >
              {saveLabel(saveStatus)}
            </Typography>
          </Pressable>
        </View>
        <Pressable
          accessibilityHint="Links Goals or a Project without sharing your reflection"
          accessibilityLabel="Organize reflection"
          accessibilityRole="button"
          hitSlop={8}
          onPress={() => setLinkPickerOpen(true)}
          style={{ alignItems: 'center', height: 44, justifyContent: 'center', width: 44 }}
        >
          <Ionicons name="link-outline" color={colors.text.secondary} size={21} />
        </Pressable>
        <Pressable
          accessibilityHint="Opens explicit PDF, text, and copy options"
          accessibilityLabel="Export reflection"
          accessibilityRole="button"
          hitSlop={8}
          onPress={() => setExportOpen(true)}
          style={{ alignItems: 'center', height: 44, justifyContent: 'center', width: 44 }}
        >
          <Ionicons name="share-outline" color={colors.text.secondary} size={21} />
        </Pressable>
        <Pressable
          accessibilityLabel="Delete reflection"
          accessibilityRole="button"
          hitSlop={8}
          onPress={() => setDeleteOpen(true)}
          style={{ alignItems: 'center', height: 44, justifyContent: 'center', width: 44 }}
        >
          <Ionicons name="trash-outline" color={colors.feedback.danger.text} size={20} />
        </Pressable>
      </View>

      {saveError ? (
        <Pressable
          accessibilityHint="Retries saving this reflection"
          accessibilityLabel={saveError}
          accessibilityRole="button"
          onPress={() => void persist(dirtyVersion)}
          style={{
            backgroundColor: colors.feedback.danger.bg,
            borderBottomColor: colors.feedback.danger.border,
            borderBottomWidth: 1,
            paddingHorizontal: SPACE['2xl'],
            paddingVertical: SPACE.md,
          }}
        >
          <Typography variant="caption" style={{ color: colors.feedback.danger.text }}>
            {saveError} Tap to retry.
          </Typography>
        </Pressable>
      ) : null}

      <View
        accessibilityLabel="Private reflection"
        style={{
          alignItems: 'center',
          backgroundColor: colors.background.selectedRow,
          borderBottomColor: colors.border.divider,
          borderBottomWidth: 1,
          flexDirection: 'row',
          gap: SPACE.sm,
          minHeight: 42,
          paddingHorizontal: compact ? SPACE.lg : SPACE['2xl'],
        }}
      >
        <Ionicons name="lock-closed-outline" color={colors.text.accent} size={15} />
        <Typography variant="caption" style={{ flex: 1 }}>
          Private by default. Goal and Project links only organize this reflection.
        </Typography>
      </View>

      {(selectedGoals.length || selectedProject) ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ alignItems: 'center', gap: SPACE.md, paddingHorizontal: SPACE['2xl'] }}
          style={{ borderBottomColor: colors.border.divider, borderBottomWidth: 1, flexGrow: 0, minHeight: 52 }}
        >
          <Typography variant="caption">Linked to</Typography>
          {selectedGoals.map((goal) => (
            <View key={goal.id} style={{ backgroundColor: colors.background.selectedRow, borderRadius: RADIUS.round, paddingHorizontal: SPACE.lg, paddingVertical: SPACE.sm }}>
              <Typography variant="emphasis-sm">{goal.title}</Typography>
            </View>
          ))}
          {selectedProject ? (
            <View style={{ alignItems: 'center', backgroundColor: colors.background.input, borderRadius: RADIUS.round, flexDirection: 'row', gap: SPACE.sm, paddingHorizontal: SPACE.lg, paddingVertical: SPACE.sm }}>
              <Ionicons name="folder-outline" color={colors.text.accent} size={15} />
              <Typography variant="emphasis-sm">{selectedProject.title}</Typography>
            </View>
          ) : null}
        </ScrollView>
      ) : null}

      <ScrollView
        contentContainerStyle={{ alignSelf: 'center', minHeight: '100%', padding: compact ? SPACE['2xl'] : SPACE['5xl'], paddingBottom: 120, width: '100%' }}
        keyboardShouldPersistTaps="handled"
        style={{ flex: 1 }}
      >
        <View style={{ alignSelf: 'center', maxWidth: 840, width: '100%' }}>
          <TextInput
            accessibilityLabel="Reflection title"
            maxLength={200}
            onChangeText={(value) => { setTitle(value); markDirty(); }}
            placeholder="Reflection"
            placeholderTextColor={colors.text.muted}
            style={{
              color: colors.text.primary,
              fontFamily: FONT.editorial.medium,
              fontSize: compact ? 28 : 38,
              lineHeight: compact ? 36 : 48,
              outlineStyle: 'solid',
              outlineWidth: 0,
              padding: 0,
            }}
            value={title}
          />
          <Typography variant="caption" style={{ marginTop: SPACE.md }}>
            {entry.createdAt.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}
          </Typography>
          <TextInput
            accessibilityLabel="Quick Reflection"
            accessibilityHint="Write privately in your own words"
            autoFocus={!body}
            maxLength={100000}
            multiline
            onChangeText={(value) => { setBody(value); markDirty(); }}
            placeholder="Write freely…"
            placeholderTextColor={colors.text.muted}
            style={{
              color: colors.text.primary,
              ...TYPE.editorBody,
              marginTop: SPACE['4xl'],
              minHeight: compact ? 380 : 520,
              outlineStyle: 'solid',
              outlineWidth: 0,
              padding: 0,
              textAlignVertical: 'top',
            }}
            value={body}
          />
        </View>
      </ScrollView>

      <EntryLinkPicker
        goals={goals}
        projects={projects}
        onApply={(nextGoalIds, nextCategoryIds, nextProjectId) => {
          setGoalIds(nextGoalIds);
          setCategoryIds(nextCategoryIds);
          setProjectId(nextProjectId);
          markDirty();
        }}
        onClose={() => setLinkPickerOpen(false)}
        selectedCategoryIds={categoryIds}
        selectedGoalIds={goalIds}
        selectedProjectId={projectId}
        visible={linkPickerOpen}
      />

      <Modal visible={exportOpen} onClose={() => setExportOpen(false)} closeOnBackdropPress showCloseButton={false}>
        <Typography variant="title">Export reflection</Typography>
        <View style={{ gap: SPACE.md, marginTop: SPACE.xl }}>
          <Button onPress={() => void exportAction('pdf')} variant="secondary">Export as PDF</Button>
          <Button onPress={() => void exportAction('text')} variant="secondary">Export as plain text</Button>
          <Button onPress={() => void exportAction('copy')} variant="secondary">Copy text</Button>
        </View>
        {exportMessage ? <Typography variant="caption" style={{ marginTop: SPACE.lg }}>{exportMessage}</Typography> : null}
        <Button onPress={() => setExportOpen(false)} style={{ marginTop: SPACE.xl }}>Done</Button>
      </Modal>

      <Modal
        visible={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        closeOnBackdropPress
        showCloseButton={false}
        cancelText="Cancel"
        confirmText="Delete reflection"
        confirmVariant="destructive"
        onConfirm={() => void remove()}
      >
        <Typography variant="title">Delete this reflection?</Typography>
        <Typography variant="body" style={{ marginTop: SPACE.md }}>
          This permanently removes the Reflection. Linked Goals and Projects are not deleted.
        </Typography>
      </Modal>
    </View>
  );
}
