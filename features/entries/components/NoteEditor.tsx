import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal as RNModal,
  Pressable,
  ScrollView,
  TextInput,
  View,
  type LayoutChangeEvent,
  type ViewStyle,
  useWindowDimensions,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BrandIcon } from '@/components/ui/BrandIcon';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Typography } from '@/components/ui/Typography';
import { RADIUS, SPACE, elevationStyle } from '@/constants/design';
import { GOAL_CATEGORY_CATALOG } from '@/lib/goals/catalog';
import { goalWorkspaceHref } from '@/features/goals/navigation';
import { useProjectStore } from '@/features/projects/store';
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
import { extractGoalReferences, extractIntelligenceReferences } from '../editor-document';
import { copyEntryText, exportEntryPdf, exportEntryText } from '../export';
import { EntryLinkPicker } from './EntryLinkPicker';
import { RichTextEditor } from './RichTextEditor';

const AUTOSAVE_DELAY = 900;
const MIN_INLINE_INTELLIGENCE_WORKSPACE = 1020;

const chromeIconButton: ViewStyle = {
  alignItems: 'center',
  borderRadius: RADIUS.md,
  height: 40,
  justifyContent: 'center',
  width: 40,
};

function localDraftKey(entryId: string): string {
  return `ohara-entry-draft:${entryId}`;
}

function saveLabel(status: EntrySaveStatus): string {
  if (status === 'saving') return 'Saving…';
  if (status === 'saved') return 'Saved';
  if (status === 'error') return "Couldn't save — Retry";
  return 'Saved';
}

export function NoteEditor({
  entryId,
  embedded = false,
  showBack = true,
  onBack,
}: {
  entryId: string;
  embedded?: boolean;
  showBack?: boolean;
  onBack?: () => void;
}) {
  const colors = useThemeColors();
  const darkMode = useUIStore((state) => state.themeMode === 'dark');
  const { width } = useWindowDimensions();
  const narrow = width < 840;
  const libraryCollapsed = useUIStore((state) => state.entriesLibraryCollapsed);
  const entries = useEntriesStore((state) => state.entries);
  const goals = useEntriesStore((state) => state.goals);
  const loadContext = useEntriesStore((state) => state.loadContext);
  const upsertEntry = useEntriesStore((state) => state.upsertEntry);
  const updateEntry = useEntriesStore((state) => state.updateEntry);
  const deleteEntry = useEntriesStore((state) => state.deleteEntry);
  const projects = useProjectStore((state) => state.projects);
  const loadProjects = useProjectStore((state) => state.loadProjects);
  const intelligenceOpen = useUIStore((state) => state.entriesIntelligenceOpen);
  const setIntelligenceOpen = useUIStore((state) => state.setEntriesIntelligenceOpen);
  const [workspaceWidth, setWorkspaceWidth] = useState(0);

  const estimatedWorkspaceWidth = embedded
    ? Math.max(0, width - (libraryCollapsed && width >= 900 ? 48 : 390))
    : width;
  const intelligenceInSheet = narrow
    || (workspaceWidth || estimatedWorkspaceWidth) < MIN_INLINE_INTELLIGENCE_WORKSPACE;

  function measureWorkspace(event: LayoutChangeEvent) {
    const nextWidth = event.nativeEvent.layout.width;
    setWorkspaceWidth((currentWidth) => (
      Math.abs(currentWidth - nextWidth) > 1 ? nextWidth : currentWidth
    ));
  }

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
  const [projectId, setProjectId] = useState(cachedEntry?.project?.id ?? null);
  const [saveStatus, setSaveStatus] = useState<EntrySaveStatus>('idle');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [linkPickerOpen, setLinkPickerOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [overflowOpen, setOverflowOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [exportMessage, setExportMessage] = useState<string | null>(null);
  const [dirtyVersion, setDirtyVersion] = useState(0);
  const [focusedReferenceId, setFocusedReferenceId] = useState<string | null>(null);
  const [referenceFocusNonce, setReferenceFocusNonce] = useState(0);
  const [referenceRemoval, setReferenceRemoval] = useState<{ id: string; nonce: number } | null>(null);
  const lastSavedVersion = useRef(0);
  const lastAttemptedVersion = useRef(0);
  const savingRef = useRef(false);
  const latestDraftRef = useRef<EntryDraft | null>(null);

  useEffect(() => {
    if (goals.length === 0) void loadContext();
    if (projects.length === 0) void loadProjects();
  }, [goals.length, loadContext, loadProjects, projects.length]);

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
        setProjectId(result.project?.id ?? null);
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
      setProjectId(draft.relationships.projectId ?? null);
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
    expectedContentVersion: entry?.contentVersion,
    relationships: { goalIds, projectId, categoryIds, milestoneIds: [] },
  }), [categoryIds, content, entry?.contentVersion, entry?.pinned, goalIds, plainText, projectId, title]);
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

  async function handleBack() {
    if (dirtyVersion > lastSavedVersion.current) await persist(dirtyVersion);
    if (onBack) onBack();
    else router.replace('/(app)/entries' as never);
  }

  async function handleDelete() {
    if (!entry) return;
    try {
      await deleteEntry(entry.id);
      if (onBack) onBack();
      else router.replace('/(app)/entries' as never);
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
      if (action === 'pdf') await exportEntryPdf(title, plainText, { document: content, goals });
      if (action === 'text') exportEntryText(title, plainText);
      if (action === 'copy') await copyEntryText(title, plainText);
      setExportMessage(action === 'copy' ? 'Copied to clipboard.' : 'Export started.');
    } catch (error) {
      setExportMessage(error instanceof Error ? error.message : 'Export failed');
    }
  }

  const selectedGoals = goals.filter((goal) => goalIds.includes(goal.id));
  const selectedProject = projects.find((project) => project.id === projectId) ?? null;
  const goalReferences = useMemo(() => extractGoalReferences(content), [content]);
  const intelligenceReferences = useMemo(
    () => extractIntelligenceReferences(content),
    [content],
  );
  const relatedEntries = entries.filter((candidate) => (
    candidate.id !== entryId
    && candidate.goals.some((goal) => goalIds.includes(goal.id))
  )).slice(0, 3);

  function focusReference(referenceId: string) {
    setFocusedReferenceId(referenceId);
    setReferenceFocusNonce((nonce) => nonce + 1);
  }

  function intelligencePanel(asSheet: boolean) {
    const panelElevation = asSheet ? {} : elevationStyle('sm', colors, darkMode);

    return (
      <View
        style={[{
          alignSelf: 'stretch',
          backgroundColor: colors.background.selectedRow,
          borderColor: colors.border.divider,
          borderRadius: asSheet ? 0 : RADIUS.lg,
          borderWidth: asSheet ? 0 : 1,
          borderTopWidth: 1,
          flex: asSheet ? 1 : undefined,
          flexShrink: 0,
          margin: asSheet ? 0 : SPACE.lg,
          maxWidth: asSheet ? undefined : 328,
          overflow: 'hidden',
          width: asSheet ? '100%' : 328,
        }, panelElevation]}
      >
        <View
          style={{
            alignItems: 'center',
            borderBottomColor: colors.border.divider,
            borderBottomWidth: 1,
            flexDirection: 'row',
            minHeight: 68,
            paddingHorizontal: SPACE['2xl'],
          }}
        >
          <View
            style={{
              alignItems: 'center',
              backgroundColor: colors.background.card,
              borderRadius: RADIUS.round,
              height: 36,
              justifyContent: 'center',
              marginRight: SPACE.lg,
              width: 36,
            }}
          >
            <BrandIcon name="ohara" color={colors.accent.primary} size={20} />
          </View>
          <Typography variant="title" style={{ flex: 1, fontSize: 17, lineHeight: 24 }}>
            Ohara Intelligence
          </Typography>
          <Pressable
            accessibilityLabel="Close Ohara Intelligence"
            accessibilityRole="button"
            onPress={() => setIntelligenceOpen(false)}
            style={({ pressed }) => [chromeIconButton, {
              backgroundColor: pressed ? colors.background.hoverAccent : 'transparent',
            }]}
          >
            <Ionicons name="close" color={colors.text.secondary} size={22} />
          </Pressable>
        </View>
        <ScrollView
          contentContainerStyle={{ padding: SPACE['2xl'], paddingBottom: SPACE['4xl'] }}
          showsVerticalScrollIndicator={false}
        >
          <Typography variant="body-small">
            Selection references stay anchored to this note. No AI response has been generated.
          </Typography>
          <Typography variant="eyebrow" style={{ marginBottom: SPACE.md, marginTop: SPACE['3xl'] }}>
            REFERENCES
          </Typography>
          {intelligenceReferences.length ? intelligenceReferences.map((reference) => (
            <View
              key={reference.id}
              style={{
                backgroundColor: focusedReferenceId === reference.id
                  ? colors.background.selectedRow
                  : colors.background.card,
                borderColor: focusedReferenceId === reference.id
                  ? colors.border.accent
                  : colors.border.divider,
                borderRadius: RADIUS.md,
                borderWidth: 1,
                borderLeftWidth: focusedReferenceId === reference.id ? 2 : 1,
                marginBottom: SPACE.md,
                overflow: 'hidden',
              }}
            >
              <Pressable
                accessibilityLabel={`Jump to reference: ${reference.excerpt}`}
                accessibilityRole="button"
                onPress={() => focusReference(reference.id)}
                style={({ pressed }) => ({ opacity: pressed ? 0.72 : 1, padding: SPACE.lg })}
              >
                <Typography variant="emphasis-sm" numberOfLines={3} style={{ fontSize: 14, lineHeight: 20 }}>
                  “{reference.excerpt || reference.containingText || 'Referenced passage'}”
                </Typography>
                <Typography variant="caption" style={{ marginTop: SPACE.sm }}>
                  {reference.action.replace('_', ' ')} · {reference.createdAt
                    ? new Date(reference.createdAt).toLocaleString()
                    : 'Just now'}
                </Typography>
                {reference.question ? (
                  <Typography variant="body-small" style={{ marginTop: SPACE.sm }}>
                    {reference.question}
                  </Typography>
                ) : null}
                <Typography variant="caption" style={{ color: colors.text.accent, marginTop: SPACE.sm }}>
                  AI analysis reserved for OHARA Intelligence
                </Typography>
              </Pressable>
              <View style={{ borderTopColor: colors.border.divider, borderTopWidth: 1, flexDirection: 'row' }}>
                <Pressable
                  accessibilityLabel="Open reference in document"
                  accessibilityRole="button"
                  onPress={() => focusReference(reference.id)}
                  style={({ pressed }) => ({ flex: 1, opacity: pressed ? 0.65 : 1, padding: SPACE.md })}
                >
                  <Typography variant="caption" style={{ color: colors.text.accent }}>Jump to source</Typography>
                </Pressable>
                <Pressable
                  accessibilityLabel="Remove OHARA Intelligence reference"
                  accessibilityRole="button"
                  onPress={() => setReferenceRemoval({ id: reference.id, nonce: Date.now() })}
                  style={({ pressed }) => ({ opacity: pressed ? 0.65 : 1, padding: SPACE.md })}
                >
                  <Typography variant="caption" style={{ color: colors.feedback.danger.text }}>Remove</Typography>
                </Pressable>
              </View>
            </View>
          )) : (
            <View style={{ paddingVertical: SPACE.sm }}>
              <Typography variant="emphasis-sm" style={{ fontSize: 14 }}>Focus OHARA on what matters</Typography>
              <Typography variant="meta" style={{ lineHeight: 19, marginTop: SPACE.xs }}>
                Select part of your note and choose Ask OHARA to create a focused reference.
              </Typography>
            </View>
          )}
          {goalReferences.length ? (
            <>
              <Typography variant="eyebrow" style={{ marginBottom: SPACE.md, marginTop: SPACE['3xl'] }}>
                GOAL REFERENCES
              </Typography>
              {goalReferences.map((reference) => {
                const goal = goals.find((item) => item.id === reference.goalId);
                return (
                  <View
                    key={reference.id}
                    style={{
                      backgroundColor: focusedReferenceId === reference.id
                        ? colors.background.selectedRow
                        : colors.background.card,
                      borderColor: focusedReferenceId === reference.id
                        ? colors.border.accent
                        : colors.border.divider,
                      borderRadius: RADIUS.md,
                      borderWidth: 1,
                      marginBottom: SPACE.md,
                      overflow: 'hidden',
                    }}
                  >
                    <Pressable
                      accessibilityLabel={`Jump to Goal reference: ${goal?.title ?? 'Unavailable Goal'}`}
                      accessibilityRole="button"
                      onPress={() => focusReference(reference.id)}
                      style={({ pressed }) => ({ opacity: pressed ? 0.72 : 1, padding: SPACE.lg })}
                    >
                      <Typography variant="emphasis-sm" style={{ fontSize: 14 }}>
                        {goal?.title ?? 'Goal unavailable'}
                      </Typography>
                      {reference.excerpt ? (
                        <Typography variant="meta" numberOfLines={2} style={{ marginTop: SPACE.xs }}>
                          “{reference.excerpt}”
                        </Typography>
                      ) : null}
                      <Typography variant="caption" style={{ marginTop: SPACE.sm }}>
                        {reference.sourceType.replaceAll('_', ' ')}
                        {reference.progressEvidence
                          ? reference.checkboxCompleted ? ' · progress completed' : ' · progress evidence'
                          : ' · reference only'}
                      </Typography>
                    </Pressable>
                    <View style={{ borderTopColor: colors.border.divider, borderTopWidth: 1, flexDirection: 'row' }}>
                      <Pressable
                        accessibilityLabel="Open Goal reference in document"
                        accessibilityRole="button"
                        onPress={() => focusReference(reference.id)}
                        style={({ pressed }) => ({ flex: 1, opacity: pressed ? 0.65 : 1, padding: SPACE.md })}
                      >
                        <Typography variant="caption" style={{ color: colors.text.accent }}>Jump to source</Typography>
                      </Pressable>
                      {goal ? (
                        <Pressable
                          accessibilityLabel={`Open Goal: ${goal.title}`}
                          accessibilityRole="button"
                          onPress={() => router.push(goalWorkspaceHref(goal.id) as never)}
                          style={({ pressed }) => ({ opacity: pressed ? 0.65 : 1, padding: SPACE.md })}
                        >
                          <Typography variant="caption" style={{ color: colors.text.accent }}>Open Goal</Typography>
                        </Pressable>
                      ) : null}
                      <Pressable
                        accessibilityLabel="Remove Goal reference"
                        accessibilityRole="button"
                        onPress={() => setReferenceRemoval({ id: reference.id, nonce: Date.now() })}
                        style={({ pressed }) => ({ opacity: pressed ? 0.65 : 1, padding: SPACE.md })}
                      >
                        <Typography variant="caption" style={{ color: colors.feedback.danger.text }}>Remove</Typography>
                      </Pressable>
                    </View>
                  </View>
                );
              })}
            </>
          ) : null}
          <Typography variant="eyebrow" style={{ marginBottom: SPACE.md, marginTop: SPACE['3xl'] }}>
            LINKED GOALS
          </Typography>
          {selectedGoals.length ? selectedGoals.map((goal) => (
            <View
              key={goal.id}
              style={{
                backgroundColor: colors.background.card,
                borderColor: colors.border.divider,
                borderRadius: RADIUS.md,
                borderWidth: 1,
                marginBottom: SPACE.md,
                paddingHorizontal: SPACE.lg,
                paddingVertical: SPACE.lg,
              }}
            >
              <Typography variant="emphasis-sm" style={{ fontSize: 15, lineHeight: 21 }}>
                {goal.title}
              </Typography>
              <Typography variant="caption" style={{ marginTop: SPACE.xs, textTransform: 'capitalize' }}>
                {goal.status}
              </Typography>
            </View>
          )) : <Typography variant="body-small">No goals linked yet.</Typography>}
          <Typography variant="eyebrow" style={{ marginBottom: SPACE.md, marginTop: SPACE['3xl'] }}>
            RELATED ENTRIES
          </Typography>
          {relatedEntries.length ? relatedEntries.map((related) => (
            <View
              key={related.id}
              style={{
                backgroundColor: colors.background.input,
                borderRadius: RADIUS.md,
                marginBottom: SPACE.md,
                paddingHorizontal: SPACE.lg,
                paddingVertical: SPACE.md,
              }}
            >
              <Typography variant="meta">{related.title || 'Untitled entry'}</Typography>
            </View>
          )) : (
            <Typography variant="body-small">Related Notes and Reflections will appear here.</Typography>
          )}
          <View
            style={{
              backgroundColor: colors.background.card,
              borderColor: colors.border.divider,
              borderRadius: RADIUS.lg,
              borderWidth: 1,
              marginTop: SPACE['3xl'],
              padding: SPACE.xl,
            }}
          >
            <View style={{ alignItems: 'center', flexDirection: 'row', gap: SPACE.md }}>
              <Ionicons name="sparkles-outline" color={colors.accent.primary} size={18} />
              <Typography variant="emphasis-sm" style={{ fontSize: 15 }}>Ask Ohara</Typography>
            </View>
            <Typography variant="body-small" style={{ marginTop: SPACE.md }}>
              Future insights and chat will use your linked context. This preview does not make an AI request.
            </Typography>
          </View>
        </ScrollView>
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
        {showBack ? (
          <Pressable
            accessibilityLabel="Back to Echo library"
            accessibilityRole="button"
            onPress={() => void handleBack()}
            hitSlop={8}
            style={({ pressed }) => [chromeIconButton, {
              backgroundColor: pressed ? colors.background.hoverAccent : 'transparent',
            }]}
          >
            <Ionicons name="arrow-back" color={colors.text.primary} size={22} />
          </Pressable>
        ) : null}
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
        <Pressable accessibilityLabel="Organize note with Goals or a Project" accessibilityRole="button" onPress={() => setLinkPickerOpen(true)} style={chromeIconButton}>
          <Ionicons name="link-outline" color={colors.text.secondary} size={21} />
        </Pressable>
        <Pressable accessibilityLabel="Export note" accessibilityRole="button" onPress={() => setExportOpen(true)} style={chromeIconButton}>
          <Ionicons name="share-outline" color={colors.text.secondary} size={21} />
        </Pressable>
        {!narrow && !embedded ? <Button onPress={handleNewNote} size="compact" variant="secondary">New Note</Button> : null}
        <Pressable
          accessibilityLabel={intelligenceOpen ? 'Collapse Ohara Intelligence' : 'Open Ohara Intelligence'}
          accessibilityRole="button"
          onPress={() => setIntelligenceOpen(!intelligenceOpen)}
          style={({ pressed }) => [chromeIconButton, {
            backgroundColor: intelligenceOpen || pressed
              ? colors.background.selectedRow
              : 'transparent',
          }]}
        >
          <Ionicons name="sparkles-outline" color={colors.text.accent} size={21} />
        </Pressable>
        <Pressable accessibilityLabel="More note actions" accessibilityRole="button" onPress={() => setOverflowOpen(true)} style={chromeIconButton}>
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

      {(selectedGoals.length || categoryIds.length || selectedProject) ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ alignItems: 'center', gap: SPACE.md, paddingHorizontal: SPACE['2xl'] }}
          style={{
            borderBottomColor: colors.border.divider,
            borderBottomWidth: 1,
            flexGrow: 0,
            minHeight: 56,
          }}
        >
          <Typography variant="label" style={{ fontSize: 14, marginRight: SPACE.xs }}>Linked to:</Typography>
          {selectedGoals.map((goal) => (
            <View
              key={goal.id}
              style={{
                alignItems: 'center',
                backgroundColor: colors.background.selectedRow,
                borderColor: colors.border.divider,
                borderRadius: RADIUS.round,
                borderWidth: 1,
                flexDirection: 'row',
                minHeight: 32,
                paddingHorizontal: SPACE.lg,
              }}
            >
              <Typography variant="emphasis-sm" style={{ fontSize: 14 }}>{goal.title}</Typography>
            </View>
          ))}
          {categoryIds.map((id) => (
            <View
              key={id}
              style={{
                alignItems: 'center',
                backgroundColor: colors.background.input,
                borderRadius: RADIUS.round,
                minHeight: 32,
                paddingHorizontal: SPACE.lg,
              }}
            >
              <Typography variant="emphasis-sm" style={{ fontSize: 14 }}>
                {GOAL_CATEGORY_CATALOG.find((category) => category.id === id)?.label}
              </Typography>
            </View>
          ))}
          {selectedProject ? (
            <View
              style={{
                alignItems: 'center',
                backgroundColor: colors.background.input,
                borderRadius: RADIUS.round,
                flexDirection: 'row',
                gap: SPACE.sm,
                minHeight: 32,
                paddingHorizontal: SPACE.lg,
              }}
            >
              <Ionicons name="folder-outline" color={colors.text.accent} size={15} />
              <Typography variant="emphasis-sm" style={{ fontSize: 14 }}>{selectedProject.title}</Typography>
            </View>
          ) : null}
          <Pressable
            accessibilityRole="button"
            onPress={() => setLinkPickerOpen(true)}
            style={({ pressed }) => ({
              alignItems: 'center',
              borderRadius: RADIUS.md,
              justifyContent: 'center',
              minHeight: 36,
              opacity: pressed ? 0.7 : 1,
              paddingHorizontal: SPACE.md,
            })}
          >
            <Typography variant="emphasis-sm" style={{ color: colors.text.accent, fontSize: 14 }}>
              Edit links
            </Typography>
          </Pressable>
        </ScrollView>
      ) : null}

      <View
        onLayout={measureWorkspace}
        style={{ flex: 1, flexDirection: 'row', minHeight: 0, minWidth: 0, overflow: 'hidden' }}
      >
        <View
          testID="note-editor-column"
          style={{
            backgroundColor: colors.background.card,
            flexBasis: 0,
            flexGrow: 1,
            minWidth: 0,
            overflow: 'hidden',
          }}
        >
          <RichTextEditor
            document={content}
            entryId={entry.id}
            goals={goals}
            focusedReferenceId={focusedReferenceId}
            referenceFocusNonce={referenceFocusNonce}
            referenceRemoval={referenceRemoval}
            onReferenceRemoved={(referenceId) => {
              setReferenceRemoval(null);
              if (focusedReferenceId === referenceId) setFocusedReferenceId(null);
            }}
            onIntelligenceReferenceCreated={(referenceId) => {
              focusReference(referenceId);
              setIntelligenceOpen(true);
            }}
            onReferenceActivated={(referenceId) => {
              focusReference(referenceId);
              setIntelligenceOpen(true);
            }}
            onChange={(nextContent, nextPlainText) => {
              setContent(nextContent);
              setPlainText(nextPlainText);
              markDirty();
            }}
            sidePanel={intelligenceOpen && !intelligenceInSheet
              ? intelligencePanel(false)
              : undefined}
          />
        </View>
      </View>

      {intelligenceInSheet ? (
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
              {intelligencePanel(true)}
            </Pressable>
          </Pressable>
        </RNModal>
      ) : null}

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
        {!embedded ? (
          <Button onPress={handleNewNote} style={{ marginTop: 16 }} variant="secondary">New Note</Button>
        ) : null}
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
