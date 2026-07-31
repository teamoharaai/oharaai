import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal as RNModal,
  Pressable,
  ScrollView,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Typography } from '@/components/ui/Typography';
import { GOAL_CATEGORY_CATALOG } from '@/lib/goals/catalog';
import { useThemeColors, useUIStore } from '@/store/uiStore';
import { fetchEntry, isPersistenceUnavailable } from '../services/entry-service';
import { useEntriesStore } from '../store';
import type {
  EntryDraft,
  EntryRecord,
  EntrySaveStatus,
  RichTextDocument,
} from '../types';
import { createEmptyDocument } from '../utils';
import { copyEntryText, exportEntryPdf, exportEntryText } from '../export';
import { EntryLinkPicker } from './EntryLinkPicker';
import { RichTextEditor } from './RichTextEditor';

const AUTOSAVE_DELAY = 900;

function localDraftKey(entryId: string): string {
  return `ohara-entry-draft:${entryId}`;
}

function saveLabel(status: EntrySaveStatus): string {
  if (status === 'saving') return 'Saving…';
  if (status === 'saved') return 'Saved';
  if (status === 'error') return 'Not saved — retry';
  return 'Saved';
}

export function NoteEditor({ entryId }: { entryId: string }) {
  const colors = useThemeColors();
  const { width } = useWindowDimensions();
  const narrow = width < 840;
  const entries = useEntriesStore((state) => state.entries);
  const goals = useEntriesStore((state) => state.goals);
  const loadContext = useEntriesStore((state) => state.loadContext);
  const upsertEntry = useEntriesStore((state) => state.upsertEntry);
  const updateEntry = useEntriesStore((state) => state.updateEntry);
  const deleteEntry = useEntriesStore((state) => state.deleteEntry);
  const intelligenceOpen = useUIStore((state) => state.entriesIntelligenceOpen);
  const setIntelligenceOpen = useUIStore((state) => state.setEntriesIntelligenceOpen);

  const cachedEntry = entries.find((entry) => entry.id === entryId) ?? null;
  const [entry, setEntry] = useState<EntryRecord | null>(cachedEntry);
  const [loading, setLoading] = useState(!cachedEntry);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [title, setTitle] = useState(cachedEntry?.title ?? '');
  const [content, setContent] = useState<RichTextDocument>(
    cachedEntry?.content ?? createEmptyDocument(),
  );
  const [plainText, setPlainText] = useState(cachedEntry?.plainText ?? '');
  const [goalIds, setGoalIds] = useState(cachedEntry?.goals.map((goal) => goal.id) ?? []);
  const [categoryIds, setCategoryIds] = useState(cachedEntry?.categoryIds ?? []);
  const [saveStatus, setSaveStatus] = useState<EntrySaveStatus>('idle');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [linkPickerOpen, setLinkPickerOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [overflowOpen, setOverflowOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [exportMessage, setExportMessage] = useState<string | null>(null);
  const [dirtyVersion, setDirtyVersion] = useState(0);
  const lastSavedVersion = useRef(0);
  const lastAttemptedVersion = useRef(0);
  const savingRef = useRef(false);
  const latestDraftRef = useRef<EntryDraft | null>(null);

  useEffect(() => {
    if (goals.length === 0) void loadContext();
  }, [goals.length, loadContext]);

  useEffect(() => {
    let active = true;
    if (cachedEntry) return;
    setLoading(true);
    void fetchEntry(entryId)
      .then((result) => {
        if (!active) return;
        if (!result) {
          setLoadError('This note is no longer available.');
          return;
        }
        setEntry(result);
        upsertEntry(result);
        setTitle(result.title);
        setContent(result.content);
        setPlainText(result.plainText);
        setGoalIds(result.goals.map((goal) => goal.id));
        setCategoryIds(result.categoryIds);
      })
      .catch((error) => {
        if (active) setLoadError(error instanceof Error ? error.message : 'Could not load note');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [cachedEntry, entryId, upsertEntry]);

  useEffect(() => {
    if (!entry || typeof window === 'undefined') return;
    const stored = window.localStorage.getItem(localDraftKey(entry.id));
    if (!stored) return;
    try {
      const draft = JSON.parse(stored) as EntryDraft;
      setTitle(draft.title);
      setContent(draft.content);
      setPlainText(draft.plainText);
      setGoalIds(draft.relationships.goalIds);
      setCategoryIds(draft.relationships.categoryIds);
      setSaveStatus('error');
      setSaveError('Recovered an unsaved local draft. Retry saving when you are online.');
      setDirtyVersion((version) => version + 1);
    } catch {
      window.localStorage.removeItem(localDraftKey(entry.id));
    }
  }, [entry]);

  const draft = useMemo<EntryDraft>(() => ({
    entryType: 'note',
    title,
    content,
    plainText,
    pinned: entry?.pinned ?? false,
    archived: false,
    relationships: { goalIds, categoryIds, milestoneIds: [] },
  }), [categoryIds, content, entry?.pinned, goalIds, plainText, title]);
  latestDraftRef.current = draft;

  useEffect(() => {
    if (
      !entry
      || typeof window === 'undefined'
      || dirtyVersion === 0
      || dirtyVersion <= lastSavedVersion.current
    ) return;
    window.localStorage.setItem(localDraftKey(entry.id), JSON.stringify(draft));
  }, [dirtyVersion, draft, entry]);

  const persist = useCallback(async (version: number) => {
    if (!entry || savingRef.current || version <= lastSavedVersion.current) return;
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
    } catch (error) {
      setSaveStatus('error');
      setSaveError(
        isPersistenceUnavailable(error)
          ? 'You appear to be offline. Your draft is kept on this device; retry when connected.'
          : error instanceof Error ? error.message : 'Autosave failed. Your draft is still here.',
      );
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(localDraftKey(entry.id), JSON.stringify(latestDraftRef.current));
      }
    } finally {
      savingRef.current = false;
    }
  }, [entry, updateEntry]);

  useEffect(() => {
    if (
      !entry
      || dirtyVersion === 0
      || dirtyVersion <= lastSavedVersion.current
      || dirtyVersion <= lastAttemptedVersion.current
    ) return;
    const timer = setTimeout(() => void persist(dirtyVersion), AUTOSAVE_DELAY);
    return () => clearTimeout(timer);
  }, [dirtyVersion, entry, persist, saveStatus]);

  function markDirty() {
    setDirtyVersion((version) => version + 1);
    setSaveStatus('idle');
  }

  function handleBack() {
    if (dirtyVersion > lastSavedVersion.current) void persist(dirtyVersion);
    router.replace('/(app)/entries' as never);
  }

  async function handleDelete() {
    if (!entry) return;
    try {
      await deleteEntry(entry.id);
      router.replace('/(app)/entries' as never);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Could not delete note');
    }
  }

  async function handleNewNote() {
    if (dirtyVersion > lastSavedVersion.current) await persist(dirtyVersion);
    router.replace('/(app)/entries?create=note' as never);
  }

  async function exportAction(action: 'pdf' | 'text' | 'copy') {
    setExportMessage(null);
    try {
      if (action === 'pdf') exportEntryPdf(title, plainText);
      if (action === 'text') exportEntryText(title, plainText);
      if (action === 'copy') await copyEntryText(title, plainText);
      setExportMessage(action === 'copy' ? 'Copied to clipboard.' : 'Export started.');
    } catch (error) {
      setExportMessage(error instanceof Error ? error.message : 'Export failed');
    }
  }

  const selectedGoals = goals.filter((goal) => goalIds.includes(goal.id));
  const relatedEntries = entries.filter((candidate) => (
    candidate.id !== entryId
    && candidate.goals.some((goal) => goalIds.includes(goal.id))
  )).slice(0, 3);

  function intelligencePanel() {
    return (
      <View
        style={{
          backgroundColor: colors.background.card,
          borderLeftColor: colors.border.divider,
          borderLeftWidth: narrow ? 0 : 1,
          flex: 1,
          maxWidth: narrow ? undefined : 340,
          padding: 22,
          width: narrow ? '100%' : 340,
        }}
      >
        <View style={{ alignItems: 'center', flexDirection: 'row' }}>
          <Typography variant="title" style={{ flex: 1 }}>Ohara Intelligence</Typography>
          <Pressable
            accessibilityLabel="Close Ohara Intelligence"
            onPress={() => setIntelligenceOpen(false)}
          >
            <Ionicons name="close" color={colors.text.secondary} size={22} />
          </Pressable>
        </View>
        <Typography variant="caption" style={{ marginTop: 6 }}>
          Context for this note. No AI response has been generated.
        </Typography>
        <Typography variant="eyebrow" style={{ marginBottom: 8, marginTop: 24 }}>
          LINKED GOALS
        </Typography>
        {selectedGoals.length ? selectedGoals.map((goal) => (
          <View
            key={goal.id}
            style={{
              backgroundColor: colors.background.input,
              borderRadius: 10,
              marginBottom: 8,
              padding: 10,
            }}
          >
            <Typography variant="emphasis-sm">{goal.title}</Typography>
            <Typography variant="caption">{goal.status}</Typography>
          </View>
        )) : <Typography variant="caption">No goals linked yet.</Typography>}
        <Typography variant="eyebrow" style={{ marginBottom: 8, marginTop: 22 }}>
          RELATED ENTRIES
        </Typography>
        {relatedEntries.length ? relatedEntries.map((related) => (
          <Typography key={related.id} variant="caption" style={{ marginBottom: 7 }}>
            {related.title || 'Untitled entry'}
          </Typography>
        )) : <Typography variant="caption">Related Notes and Reflections will appear here.</Typography>}
        <View
          style={{
            borderColor: colors.border.subtle,
            borderRadius: 12,
            borderStyle: 'dashed',
            borderWidth: 1,
            marginTop: 24,
            padding: 14,
          }}
        >
          <Typography variant="emphasis-sm">Ask Ohara</Typography>
          <Typography variant="caption" style={{ marginTop: 4 }}>
            Future insights and chat will use your linked context. This preview does not make an AI request.
          </Typography>
        </View>
      </View>
    );
  }

  if (loading) {
    return <View style={{ alignItems: 'center', flex: 1, justifyContent: 'center' }}>
      <ActivityIndicator color={colors.accent.primary} />
    </View>;
  }
  if (loadError || !entry) {
    return <View style={{ alignItems: 'center', flex: 1, justifyContent: 'center', padding: 24 }}>
      <Typography variant="title">Note unavailable</Typography>
      <Typography variant="body" style={{ marginTop: 8 }}>{loadError}</Typography>
      <Button onPress={handleBack} style={{ marginTop: 18 }}>Back to Notes</Button>
    </View>;
  }

  return (
    <View style={{ backgroundColor: colors.background.page, flex: 1, minHeight: 0 }}>
      <View
        style={{
          alignItems: 'center',
          backgroundColor: colors.background.card,
          borderBottomColor: colors.border.divider,
          borderBottomWidth: 1,
          flexDirection: 'row',
          gap: 10,
          minHeight: 64,
          paddingHorizontal: narrow ? 12 : 20,
          paddingVertical: 8,
        }}
      >
        <Pressable accessibilityLabel="Back to Notes library" onPress={handleBack} hitSlop={8}>
          <Ionicons name="arrow-back" color={colors.text.primary} size={22} />
        </Pressable>
        <TextInput
          accessibilityLabel="Note title"
          onChangeText={(value) => { setTitle(value); markDirty(); }}
          placeholder="Untitled note"
          placeholderTextColor={colors.text.muted}
          style={{
            color: colors.text.primary,
            flex: 1,
            fontFamily: 'Inter-SemiBold',
            fontSize: narrow ? 17 : 20,
            minWidth: 100,
            outlineStyle: 'solid',
            outlineWidth: 0,
          }}
          value={title}
        />
        {!narrow ? (
          <Pressable onPress={() => saveStatus === 'error' && void persist(dirtyVersion)}>
            <Typography
              accessibilityRole={saveStatus === 'error' ? 'button' : undefined}
              variant="caption"
              style={{ color: saveStatus === 'error' ? colors.feedback.danger.text : colors.text.muted }}
            >
              {saveLabel(saveStatus)}
            </Typography>
          </Pressable>
        ) : null}
        <Pressable accessibilityLabel="Link note to goals" onPress={() => setLinkPickerOpen(true)}>
          <Ionicons name="link-outline" color={colors.text.secondary} size={21} />
        </Pressable>
        <Pressable accessibilityLabel="Export note" onPress={() => setExportOpen(true)}>
          <Ionicons name="share-outline" color={colors.text.secondary} size={21} />
        </Pressable>
        {!narrow ? <Button onPress={handleNewNote} size="compact" variant="secondary">New Note</Button> : null}
        <Pressable
          accessibilityLabel={intelligenceOpen ? 'Collapse Ohara Intelligence' : 'Open Ohara Intelligence'}
          onPress={() => setIntelligenceOpen(!intelligenceOpen)}
        >
          <Ionicons name="sparkles-outline" color={colors.text.accent} size={21} />
        </Pressable>
        <Pressable accessibilityLabel="More note actions" onPress={() => setOverflowOpen(true)}>
          <Ionicons name="ellipsis-horizontal" color={colors.text.secondary} size={22} />
        </Pressable>
      </View>

      {saveError ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => void persist(dirtyVersion)}
          style={{
            backgroundColor: colors.feedback.danger.bg,
            borderBottomColor: colors.feedback.danger.border,
            borderBottomWidth: 1,
            paddingHorizontal: 20,
            paddingVertical: 9,
          }}
        >
          <Typography variant="caption" style={{ color: colors.feedback.danger.text }}>
            {saveError} Tap to retry.
          </Typography>
        </Pressable>
      ) : null}

      {(selectedGoals.length || categoryIds.length) ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ alignItems: 'center', gap: 6, paddingHorizontal: 20 }}
          style={{
            borderBottomColor: colors.border.divider,
            borderBottomWidth: 1,
            flexGrow: 0,
            minHeight: 44,
          }}
        >
          <Typography variant="caption">Linked to:</Typography>
          {selectedGoals.map((goal) => (
            <View key={goal.id} style={{ backgroundColor: colors.background.input, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 5 }}>
              <Typography variant="caption">{goal.title}</Typography>
            </View>
          ))}
          {categoryIds.map((id) => (
            <View key={id} style={{ backgroundColor: colors.background.input, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 5 }}>
              <Typography variant="caption">
                {GOAL_CATEGORY_CATALOG.find((category) => category.id === id)?.label}
              </Typography>
            </View>
          ))}
          <Pressable onPress={() => setLinkPickerOpen(true)}>
            <Typography variant="caption" style={{ color: colors.text.accent }}>+ Add goal</Typography>
          </Pressable>
        </ScrollView>
      ) : null}

      <View style={{ flex: 1, flexDirection: 'row', minHeight: 0 }}>
        <View style={{ backgroundColor: colors.background.card, flex: 1, minWidth: 0 }}>
          <RichTextEditor
            document={content}
            onChange={(nextContent, nextPlainText) => {
              setContent(nextContent);
              setPlainText(nextPlainText);
              markDirty();
            }}
          />
        </View>
        {intelligenceOpen && !narrow ? intelligencePanel() : null}
      </View>

      {narrow ? (
        <RNModal
          animationType="slide"
          transparent
          visible={intelligenceOpen}
          onRequestClose={() => setIntelligenceOpen(false)}
        >
          <Pressable
            onPress={() => setIntelligenceOpen(false)}
            style={{ backgroundColor: colors.effects.overlay, flex: 1, justifyContent: 'flex-end' }}
          >
            <Pressable
              onPress={(event) => event.stopPropagation()}
              style={{
                backgroundColor: colors.background.card,
                borderTopLeftRadius: 20,
                borderTopRightRadius: 20,
                maxHeight: '82%',
                minHeight: '55%',
              }}
            >
              {intelligencePanel()}
            </Pressable>
          </Pressable>
        </RNModal>
      ) : null}

      <EntryLinkPicker
        goals={goals}
        onApply={(nextGoalIds, nextCategoryIds) => {
          setGoalIds(nextGoalIds);
          setCategoryIds(nextCategoryIds);
          markDirty();
        }}
        onClose={() => setLinkPickerOpen(false)}
        selectedCategoryIds={categoryIds}
        selectedGoalIds={goalIds}
        visible={linkPickerOpen}
      />

      <Modal
        visible={exportOpen}
        onClose={() => setExportOpen(false)}
        closeOnBackdropPress
        showCloseButton={false}
      >
        <Typography variant="title">Export note</Typography>
        <View style={{ gap: 8, marginTop: 16 }}>
          <Button onPress={() => void exportAction('pdf')} variant="secondary">Export as PDF</Button>
          <Button onPress={() => void exportAction('text')} variant="secondary">Export as plain text</Button>
          <Button onPress={() => void exportAction('copy')} variant="secondary">Copy text</Button>
        </View>
        {exportMessage ? <Typography variant="caption" style={{ marginTop: 12 }}>{exportMessage}</Typography> : null}
        <Button onPress={() => setExportOpen(false)} style={{ marginTop: 16 }}>Done</Button>
      </Modal>

      <Modal
        visible={overflowOpen}
        onClose={() => setOverflowOpen(false)}
        closeOnBackdropPress
        showCloseButton={false}
      >
        <Typography variant="title">Note actions</Typography>
        <Button onPress={handleNewNote} style={{ marginTop: 16 }} variant="secondary">New Note</Button>
        <Button
          onPress={() => {
            setOverflowOpen(false);
            setDeleteConfirmOpen(true);
          }}
          style={{ marginTop: 10 }}
          variant="danger"
        >
          Delete note
        </Button>
        <Button onPress={() => setOverflowOpen(false)} style={{ marginTop: 10 }} variant="secondary">
          Cancel
        </Button>
      </Modal>

      <Modal
        visible={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        closeOnBackdropPress
        showCloseButton={false}
        cancelText="Cancel"
        confirmText="Delete note"
        confirmVariant="destructive"
        onConfirm={() => void handleDelete()}
      >
        <Typography variant="title">Delete this note?</Typography>
        <Typography variant="body" style={{ marginTop: 8 }}>
          This cannot be undone. Your linked goals and categories will not be changed.
        </Typography>
      </Modal>
    </View>
  );
}
