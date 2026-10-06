import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, ScrollView, TextInput, View, useWindowDimensions } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { AuthenticatedPageShell } from '@/components/layout/AuthenticatedPageShell';
import { BrandIcon } from '@/components/ui/BrandIcon';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Typography } from '@/components/ui/Typography';
import { FONT, RADIUS, SPACE, elevationStyle } from '@/constants/design';
import { goalWorkspaceHref } from '@/features/goals/navigation';
import { setEntryProjectShare } from '@/features/projects/services/project-service';
import { useProjectStore } from '@/features/projects/store';
import { useThemeColors, useUIStore } from '@/store/uiStore';
import {
  EMPTY_JOURNAL_FILTERS,
  filterJournalEntries,
  journalBrowseCounts,
  type JournalFilters,
} from '../journal-library';
import {
  deleteLegacyJournalEntry,
  fetchJournalLibrary,
  updateLegacyJournalEntry,
} from '../services/entry-service';
import { useEntriesStore } from '../store';
import type {
  EntryDraft,
  EntryRecord,
  JournalContextFilter,
  JournalDateRange,
  JournalLibraryItem,
  JournalShareFilter,
  JournalSort,
  RichTextDocument,
} from '../types';
import { createEntryRequestId } from '../utils';

type Visibility = 'private' | 'project' | 'guide';

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function reflectionDocument(text: string): RichTextDocument {
  return {
    type: 'doc',
    schemaVersion: 2,
    content: text.split('\n').map((line, index) => ({
      type: 'paragraph',
      attrs: { id: `journal-${index}` },
      ...(line ? { content: [{ type: 'text', text: line }] } : {}),
    })),
  };
}

function journalTitle(date: Date): string {
  return `Journal Entry · ${date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}`;
}

function dateGroup(date: Date): string {
  const today = new Date();
  if (date.toDateString() === today.toDateString()) return 'TODAY';
  return date.toLocaleDateString('en-US', { day: 'numeric', month: 'long' }).toUpperCase();
}

function timeLabel(date: Date): string {
  const today = new Date();
  const prefix = date.toDateString() === today.toDateString() ? 'Today · ' : '';
  return `${prefix}${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
}

function visibilityLabel(scope: JournalLibraryItem['shareScope']): string {
  if (scope === 'guide') return 'Shared with Guide';
  if (scope === 'project') return 'Shared with Project';
  return 'Private to me';
}

function itemAsEntryRecord(entry: JournalLibraryItem): EntryRecord {
  return {
    id: entry.id,
    userId: entry.ownerId,
    entryType: 'reflection',
    title: entry.title,
    content: reflectionDocument(entry.plainText),
    plainText: entry.plainText,
    brtCategory: null,
    reflectionType: entry.reflectionType,
    conversationTurns: [],
    takeaway: null,
    pinned: false,
    archived: false,
    contentVersion: entry.contentVersion,
    schemaVersion: 2,
    completedAt: entry.completedAt ? new Date(entry.completedAt) : null,
    createdAt: new Date(entry.createdAt),
    updatedAt: new Date(entry.updatedAt),
    goals: entry.goals,
    project: entry.project,
    projectShareScope: entry.shareScope,
    categoryIds: [],
    milestones: [],
    echoOwned: entry.echoOwned,
  };
}

function ChoiceRow({ label, children }: { label: string; children: ReactNode }) {
  const colors = useThemeColors();
  return (
    <View style={{ gap: SPACE.sm }}>
      <Typography variant="eyebrow" style={{ color: colors.text.secondary }}>{label}</Typography>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.sm }}>{children}</View>
    </View>
  );
}

function Choice({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) {
  const colors = useThemeColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: active ? colors.background.selectedRow : colors.background.input,
        borderColor: active ? colors.border.accent : colors.border.input,
        borderRadius: RADIUS.round,
        borderWidth: 1,
        justifyContent: 'center',
        minHeight: 38,
        opacity: pressed ? 0.7 : 1,
        paddingHorizontal: SPACE.lg,
      })}
    >
      <Typography variant="caption" style={{ color: active ? colors.text.accent : colors.text.secondary }}>{label}</Typography>
    </Pressable>
  );
}

function BrowseRow({
  count,
  label,
  onPress,
  selected,
}: {
  count: number;
  label: string;
  onPress: () => void;
  selected: boolean;
}) {
  const colors = useThemeColors();
  return (
    <Pressable
      accessibilityLabel={`Show ${label}`}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => ({
        alignItems: 'center',
        backgroundColor: selected ? colors.background.selectedRow : pressed ? colors.background.subtle : 'transparent',
        borderRadius: RADIUS.md,
        flexDirection: 'row',
        gap: SPACE.md,
        minHeight: 42,
        paddingHorizontal: SPACE.md,
      })}
    >
      <Typography numberOfLines={1} variant={selected ? 'emphasis-sm' : 'body-small'} style={{ color: selected ? colors.text.accent : colors.text.primary, flex: 1 }}>{label}</Typography>
      <Typography variant="caption" style={{ color: selected ? colors.text.accent : colors.text.muted }}>{count}</Typography>
    </Pressable>
  );
}

export function ReflectionsScreen({ selectedEntryId }: { selectedEntryId?: string }) {
  const colors = useThemeColors();
  const darkMode = useUIStore((state) => state.themeMode === 'dark');
  const { width } = useWindowDimensions();
  const compact = width < 720;
  const desktopBrowse = width >= 1040;
  const params = useLocalSearchParams<{
    browse?: string | string[];
    create?: string | string[];
    projectId?: string | string[];
    goalId?: string | string[];
  }>();
  const requestedProjectId = first(params.projectId) ?? '';
  const requestedGoalId = first(params.goalId) ?? '';
  const requestedBrowse = first(params.browse);
  const initialContext: JournalContextFilter = requestedGoalId
    ? { kind: 'goal', id: requestedGoalId }
    : requestedProjectId
      ? { kind: 'project', id: requestedProjectId }
      : requestedBrowse === 'unlinked'
        ? { kind: 'unlinked' }
        : { kind: 'all' };

  const {
    goals,
    createEntry,
    updateEntry,
    deleteEntry,
    loadContext,
    upsertEntry,
  } = useEntriesStore();
  const { projects, loadProjects } = useProjectStore();
  const [entries, setEntries] = useState<JournalLibraryItem[]>([]);
  const [browseAvailable, setBrowseAvailable] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [context, setContext] = useState<JournalContextFilter>(initialContext);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<JournalSort>('newest');
  const [filters, setFilters] = useState<JournalFilters>(EMPTY_JOURNAL_FILTERS);
  const [browseOpen, setBrowseOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [composerOpen, setComposerOpen] = useState(Boolean(params.create));
  const [editingEntry, setEditingEntry] = useState<JournalLibraryItem | null>(null);
  const [body, setBody] = useState('');
  const [projectId, setProjectId] = useState(requestedProjectId);
  const [goalId, setGoalId] = useState(requestedGoalId);
  const [visibility, setVisibility] = useState<Visibility>('private');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [menuEntryId, setMenuEntryId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<JournalLibraryItem | null>(null);
  const requestId = useRef(createEntryRequestId());

  const loadJournal = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const payload = await fetchJournalLibrary();
      setEntries(payload.entries);
      setBrowseAvailable(payload.browseAvailable);
      for (const entry of payload.entries) upsertEntry(itemAsEntryRecord(entry));
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Journal could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, [upsertEntry]);

  useEffect(() => { void loadJournal(); }, [loadJournal]);

  useEffect(() => {
    const next: JournalContextFilter = requestedGoalId
      ? { kind: 'goal', id: requestedGoalId }
      : requestedProjectId
        ? { kind: 'project', id: requestedProjectId }
        : requestedBrowse === 'unlinked'
          ? { kind: 'unlinked' }
          : { kind: 'all' };
    setContext(next);
  }, [requestedBrowse, requestedGoalId, requestedProjectId]);

  useEffect(() => {
    if (!composerOpen) return;
    void loadContext();
    void loadProjects();
  }, [composerOpen, loadContext, loadProjects]);

  useEffect(() => {
    if (!params.create) return;
    setProjectId(requestedProjectId);
    setGoalId(requestedGoalId);
    setComposerOpen(true);
  }, [params.create, requestedGoalId, requestedProjectId]);

  useEffect(() => {
    const selectedGoal = goals.find((goal) => goal.id === goalId);
    if (selectedGoal?.projectId && !projectId) setProjectId(selectedGoal.projectId);
  }, [goalId, goals, projectId]);

  const browseCounts = useMemo(() => journalBrowseCounts(entries, { filters, query }), [entries, filters, query]);
  const filteredEntries = useMemo(() => filterJournalEntries({
    context,
    entries,
    filters,
    query,
    sort,
  }), [context, entries, filters, query, sort]);

  const browseProjects = useMemo(() => {
    const byId = new Map<string, { id: string; title: string }>();
    for (const entry of entries) {
      if (entry.project) byId.set(entry.project.id, { id: entry.project.id, title: entry.project.title });
    }
    return [...byId.values()].filter((project) => (browseCounts.projects.get(project.id) ?? 0) > 0)
      .sort((left, right) => left.title.localeCompare(right.title));
  }, [browseCounts.projects, entries]);

  const browseGoals = useMemo(() => {
    const byId = new Map<string, { id: string; title: string; projectId: string | null }>();
    for (const entry of entries) {
      for (const goal of entry.goals) {
        if (goal.status === 'active') byId.set(goal.id, { id: goal.id, title: goal.title, projectId: goal.projectId });
      }
    }
    return [...byId.values()].filter((goal) => (browseCounts.goals.get(goal.id) ?? 0) > 0)
      .sort((left, right) => left.title.localeCompare(right.title));
  }, [browseCounts.goals, entries]);

  const selectedBrowseProject = context.kind === 'project'
    ? browseProjects.find((project) => project.id === context.id) ?? null
    : null;
  const selectedBrowseGoal = context.kind === 'goal'
    ? browseGoals.find((goal) => goal.id === context.id) ?? null
    : null;
  const contextLabel = context.kind === 'all'
    ? 'All Entries'
    : context.kind === 'unlinked'
      ? 'Unlinked'
      : selectedBrowseProject?.title ?? selectedBrowseGoal?.title ?? 'Journal';
  const activeProjects = projects.filter((project) => project.status !== 'archived');
  const activeGoals = goals.filter((goal) => goal.status === 'active' && (!projectId || goal.projectId === projectId));
  const selectedProject = activeProjects.find((project) => project.id === projectId) ?? null;
  const visibilityOptions: Array<{ id: Visibility; label: string }> = [
    { id: 'private', label: 'Private to me' },
    ...(selectedProject?.mode === 'guide'
      ? [{ id: 'guide' as const, label: 'Shared with Guide' }]
      : selectedProject && selectedProject.mode !== 'personal'
        ? [{ id: 'project' as const, label: 'Shared with Project' }]
        : []),
  ];

  function selectContext(next: JournalContextFilter) {
    setContext(next);
    setBrowseOpen(false);
    setMenuEntryId(null);
    router.replace({
      pathname: '/(app)/journal',
      params: {
        ...(next.kind === 'project' ? { projectId: next.id } : {}),
        ...(next.kind === 'goal' ? { goalId: next.id } : {}),
        ...(next.kind === 'unlinked' ? { browse: 'unlinked' } : {}),
      },
    } as never);
  }

  function contextDefaults(): { projectId: string; goalId: string } {
    if (context.kind === 'project') return { projectId: context.id, goalId: '' };
    if (context.kind === 'goal') {
      const goal = browseGoals.find((item) => item.id === context.id);
      return { projectId: goal?.projectId ?? '', goalId: context.id };
    }
    return { projectId: '', goalId: '' };
  }

  function resetComposer() {
    setComposerOpen(false);
    setEditingEntry(null);
    setBody('');
    setProjectId('');
    setGoalId('');
    setVisibility('private');
    setSaveError(null);
    requestId.current = createEntryRequestId();
    if (params.create) router.setParams({ create: undefined });
  }

  function startEntry() {
    const defaults = contextDefaults();
    setEditingEntry(null);
    setBody('');
    setProjectId(defaults.projectId);
    setGoalId(defaults.goalId);
    setVisibility('private');
    setSaveError(null);
    requestId.current = createEntryRequestId();
    setComposerOpen(true);
  }

  function editJournalEntry(entry: JournalLibraryItem) {
    setMenuEntryId(null);
    setEditingEntry(entry);
    setBody(entry.plainText);
    setProjectId(entry.project?.id ?? '');
    setGoalId(entry.goals[0]?.id ?? '');
    setVisibility(entry.shareScope);
    setSaveError(null);
    setComposerOpen(true);
  }

  async function saveJournalEntry() {
    const text = body.trim();
    if (!text || saving) return;
    setSaving(true);
    setSaveError(null);
    const now = new Date();
    const draft: EntryDraft = {
      entryType: 'reflection',
      title: editingEntry?.title || journalTitle(now),
      content: reflectionDocument(text),
      plainText: text,
      reflectionType: 'open',
      conversationTurns: [],
      takeaway: null,
      completedAt: editingEntry?.completedAt ?? now.toISOString(),
      ...(editingEntry ? { expectedContentVersion: editingEntry.contentVersion } : { clientRequestId: requestId.current }),
      relationships: {
        goalIds: goalId ? [goalId] : [],
        projectId: projectId || null,
        categoryIds: [],
        milestoneIds: [],
      },
    };
    try {
      if (editingEntry?.echoOwned) {
        await updateLegacyJournalEntry(editingEntry.id, { content: text, title: draft.title });
      } else {
        if (editingEntry) upsertEntry(itemAsEntryRecord(editingEntry));
        const saved = editingEntry
          ? await updateEntry(editingEntry.id, draft)
          : await createEntry(draft);
        await setEntryProjectShare(saved.id, projectId ? visibility : 'private');
      }
      await loadJournal();
      resetComposer();
    } catch (caught) {
      setSaveError(caught instanceof Error ? caught.message : 'Could not save this Journal entry.');
    } finally {
      setSaving(false);
    }
  }

  async function removeJournalEntry() {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      if (deleteTarget.echoOwned) {
        await deleteLegacyJournalEntry(deleteTarget.id);
        useEntriesStore.setState((state) => ({ entries: state.entries.filter((entry) => entry.id !== deleteTarget.id) }));
      } else {
        upsertEntry(itemAsEntryRecord(deleteTarget));
        await deleteEntry(deleteTarget.id);
      }
      setDeleteTarget(null);
      await loadJournal();
    } catch (caught) {
      setSaveError(caught instanceof Error ? caught.message : 'Could not delete this Journal entry.');
    } finally {
      setSaving(false);
    }
  }

  const grouped = filteredEntries.reduce<Array<{ label: string; items: JournalLibraryItem[] }>>((groups, entry) => {
    const label = dateGroup(new Date(entry.createdAt));
    const existing = groups.find((group) => group.label === label);
    if (existing) existing.items.push(entry);
    else groups.push({ label, items: [entry] });
    return groups;
  }, []);

  const browseContent = (
    <View style={{ gap: SPACE.sm }}>
      <BrowseRow count={browseCounts.all} label="All Entries" onPress={() => selectContext({ kind: 'all' })} selected={context.kind === 'all'} />
      <BrowseRow count={browseCounts.unlinked} label="Unlinked" onPress={() => selectContext({ kind: 'unlinked' })} selected={context.kind === 'unlinked'} />
      {browseProjects.length ? <Typography variant="eyebrow" style={{ color: colors.text.muted, marginTop: SPACE.lg, paddingHorizontal: SPACE.md }}>PROJECTS</Typography> : null}
      {browseProjects.map((project) => <BrowseRow count={browseCounts.projects.get(project.id) ?? 0} key={project.id} label={project.title} onPress={() => selectContext({ kind: 'project', id: project.id })} selected={context.kind === 'project' && context.id === project.id} />)}
      {browseGoals.length ? <Typography variant="eyebrow" style={{ color: colors.text.muted, marginTop: SPACE.lg, paddingHorizontal: SPACE.md }}>GOALS</Typography> : null}
      {browseGoals.map((goal) => <BrowseRow count={browseCounts.goals.get(goal.id) ?? 0} key={goal.id} label={goal.title} onPress={() => selectContext({ kind: 'goal', id: goal.id })} selected={context.kind === 'goal' && context.id === goal.id} />)}
    </View>
  );

  function emptyTitle(): string {
    if (query.trim()) return 'No entries match your search.';
    if (context.kind === 'unlinked') return 'No unlinked entries.';
    if (context.kind === 'project') return `No journal entries linked to ${contextLabel} yet.`;
    if (context.kind === 'goal') return `No journal entries linked to ${contextLabel} yet.`;
    return 'No journal entries yet.';
  }

  return (
    <AuthenticatedPageShell>
      <View style={{ alignSelf: 'center', gap: SPACE['2xl'], maxWidth: 1220, width: '100%' }}>
        <View style={{ alignItems: compact ? 'stretch' : 'flex-end', flexDirection: compact ? 'column' : 'row', gap: SPACE.xl, justifyContent: 'space-between' }}>
          <View style={{ flex: 1 }}>
            <View style={{ alignItems: 'center', flexDirection: 'row', gap: SPACE.md }}>
              <BrandIcon color={colors.accent.primary} name="reflections" size={28} />
              <Typography accessibilityRole="header" variant="heading">Journal</Typography>
            </View>
            <Typography variant="body" style={{ color: colors.text.secondary, marginTop: SPACE.sm }}>A place to notice what&apos;s changing.</Typography>
          </View>
          <Button leftIcon={<Ionicons color={colors.text.onAccent} name="add" size={18} />} onPress={startEntry}>New Entry</Button>
        </View>

        <View style={{ alignItems: 'flex-start', flexDirection: desktopBrowse ? 'row' : 'column', gap: SPACE.xl }}>
          {desktopBrowse ? (
            <View
              accessibilityLabel="Browse Journal"
              style={{
                backgroundColor: colors.background.card,
                borderColor: colors.border.warmSubtle,
                borderRadius: RADIUS.xl,
                borderWidth: 1,
                flexBasis: 248,
                gap: SPACE.md,
                maxHeight: 680,
                padding: SPACE.lg,
                position: 'sticky' as never,
                top: SPACE.lg,
              }}
            >
              <Typography variant="emphasis-sm" style={{ paddingHorizontal: SPACE.md }}>Browse Journal</Typography>
              <ScrollView contentContainerStyle={{ paddingBottom: SPACE.sm }} showsVerticalScrollIndicator={false}>{browseContent}</ScrollView>
              {!browseAvailable ? <Typography accessibilityRole="alert" variant="caption" style={{ color: colors.feedback.pending.text, paddingHorizontal: SPACE.md }}>Browse context is temporarily unavailable. Your Journal is still here.</Typography> : null}
            </View>
          ) : null}

          <View style={{ flex: 1, gap: SPACE.xl, maxWidth: 840, minWidth: 0, width: '100%' }}>
            {!desktopBrowse ? (
              <Pressable
                accessibilityLabel="Browse Journal"
                accessibilityRole="button"
                accessibilityState={{ expanded: browseOpen }}
                onPress={() => setBrowseOpen(true)}
                style={({ pressed }) => ({ alignItems: 'center', backgroundColor: colors.background.card, borderColor: colors.border.warmSubtle, borderRadius: RADIUS.md, borderWidth: 1, flexDirection: 'row', gap: SPACE.sm, minHeight: 44, opacity: pressed ? 0.7 : 1, paddingHorizontal: SPACE.lg })}
              >
                <BrandIcon color={colors.text.accent} name="reflections" size={18} />
                <Typography numberOfLines={1} variant="emphasis-sm" style={{ flex: 1 }}>{contextLabel}</Typography>
                <Ionicons color={colors.text.muted} name="chevron-down" size={17} />
              </Pressable>
            ) : null}

            <View style={{ alignItems: compact ? 'stretch' : 'center', flexDirection: compact ? 'column' : 'row', gap: SPACE.md }}>
              <View style={{ alignItems: 'center', backgroundColor: colors.background.input, borderColor: colors.border.input, borderRadius: RADIUS.md, borderWidth: 1, flex: 1, flexDirection: 'row', minHeight: 46, paddingHorizontal: SPACE.md }}>
                <Ionicons color={colors.text.muted} name="search-outline" size={18} />
                <TextInput accessibilityLabel="Search journal" onChangeText={setQuery} placeholder="Search journal..." placeholderTextColor={colors.text.muted} style={{ color: colors.text.primary, flex: 1, minHeight: 44, outlineStyle: 'none', paddingHorizontal: SPACE.sm } as never} value={query} />
              </View>
              <View style={{ alignItems: 'center', flexDirection: 'row', gap: SPACE.sm }}>
                <Pressable accessibilityLabel="Sort Journal entries" accessibilityRole="button" accessibilityState={{ expanded: sortOpen }} onPress={() => setSortOpen((value) => !value)} style={({ pressed }) => ({ alignItems: 'center', backgroundColor: colors.background.selectedRow, borderColor: colors.border.divider, borderRadius: RADIUS.round, borderWidth: 1, flexDirection: 'row', gap: SPACE.xs, minHeight: 42, opacity: pressed ? 0.7 : 1, paddingHorizontal: SPACE.lg })}><Ionicons color={colors.text.accent} name="swap-vertical-outline" size={16} /><Typography variant="emphasis-sm" style={{ color: colors.text.accent }}>{sort === 'newest' ? 'Newest' : 'Oldest'}</Typography></Pressable>
                <Pressable accessibilityLabel="Filter Journal entries" accessibilityRole="button" accessibilityState={{ expanded: filtersOpen }} onPress={() => setFiltersOpen(true)} style={({ pressed }) => ({ alignItems: 'center', backgroundColor: filters.share !== 'all' || filters.dateRange !== 'all' ? colors.background.selectedRow : colors.background.card, borderColor: colors.border.divider, borderRadius: RADIUS.round, borderWidth: 1, flexDirection: 'row', gap: SPACE.xs, minHeight: 42, opacity: pressed ? 0.7 : 1, paddingHorizontal: SPACE.lg })}><Ionicons color={colors.text.accent} name="options-outline" size={16} /><Typography variant="emphasis-sm" style={{ color: colors.text.accent }}>Filters</Typography></Pressable>
              </View>
            </View>
            {sortOpen ? <View accessibilityRole="menu" style={{ alignSelf: compact ? 'stretch' : 'flex-end', backgroundColor: colors.background.card, borderColor: colors.border.divider, borderRadius: RADIUS.md, borderWidth: 1, gap: SPACE.xs, padding: SPACE.sm, width: compact ? '100%' : 180 }}>{(['newest', 'oldest'] as const).map((option) => <Pressable accessibilityRole="menuitem" key={option} onPress={() => { setSort(option); setSortOpen(false); }} style={({ pressed }) => ({ backgroundColor: sort === option ? colors.background.selectedRow : pressed ? colors.background.subtle : 'transparent', borderRadius: RADIUS.sm, minHeight: 38, justifyContent: 'center', paddingHorizontal: SPACE.md })}><Typography variant="body-small">{option === 'newest' ? 'Newest' : 'Oldest'}</Typography></Pressable>)}</View> : null}

            {context.kind !== 'all' ? (
              <View style={{ alignItems: 'center', backgroundColor: colors.background.selectedRow, borderColor: colors.border.accent, borderRadius: RADIUS.lg, borderWidth: 1, flexDirection: 'row', gap: SPACE.md, paddingHorizontal: SPACE.lg, paddingVertical: SPACE.md }}>
                <View style={{ flex: 1 }}>
                  <Typography variant="emphasis-sm" style={{ color: colors.text.accent }}>{contextLabel}</Typography>
                  <Typography variant="caption">{filteredEntries.length} {filteredEntries.length === 1 ? 'journal entry' : 'journal entries'}</Typography>
                </View>
                <Pressable accessibilityLabel="Clear Journal context" accessibilityRole="button" hitSlop={8} onPress={() => selectContext({ kind: 'all' })}><Ionicons color={colors.text.accent} name="close" size={20} /></Pressable>
              </View>
            ) : null}

            {composerOpen ? (
              <View accessibilityLabel={editingEntry ? 'Edit Journal Entry composer' : 'New Journal Entry composer'} style={{ ...elevationStyle('md', colors, darkMode), backgroundColor: colors.background.card, borderColor: colors.border.warmSubtle, borderRadius: RADIUS.xl, borderWidth: 1, gap: SPACE['2xl'], padding: compact ? SPACE.xl : SPACE['3xl'] }}>
                <View style={{ alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' }}>
                  <View><Typography variant="eyebrow">JOURNAL ENTRY</Typography><Typography variant="title" style={{ marginTop: SPACE.sm }}>How are things going?</Typography></View>
                  <Pressable accessibilityLabel="Close Journal Entry composer" accessibilityRole="button" hitSlop={8} onPress={resetComposer}><Ionicons color={colors.text.secondary} name="close" size={23} /></Pressable>
                </View>
                <TextInput accessibilityLabel="Journal Entry" autoFocus multiline onChangeText={setBody} placeholder="Write what you notice, what you learned, or how this moment feels…" placeholderTextColor={colors.text.muted} style={{ backgroundColor: colors.background.input, borderColor: colors.border.input, borderRadius: RADIUS.lg, borderWidth: 1, color: colors.text.primary, fontFamily: FONT.editorial.regular, fontSize: compact ? 17 : 19, lineHeight: compact ? 27 : 31, minHeight: compact ? 220 : 270, outlineStyle: 'none', padding: compact ? SPACE.xl : SPACE['2xl'], textAlignVertical: 'top' } as never} value={body} />
                {!editingEntry?.echoOwned ? <>
                  <ChoiceRow label="PROJECT · OPTIONAL"><Choice active={!projectId} label="None" onPress={() => { setProjectId(''); setGoalId(''); setVisibility('private'); }} />{activeProjects.map((project) => <Choice active={project.id === projectId} key={project.id} label={project.title} onPress={() => { setProjectId(project.id); setGoalId(''); setVisibility('private'); }} />)}</ChoiceRow>
                  <ChoiceRow label="GOAL · OPTIONAL"><Choice active={!goalId} label="None" onPress={() => setGoalId('')} />{activeGoals.map((goal) => <Choice active={goal.id === goalId} key={goal.id} label={goal.title} onPress={() => { setGoalId(goal.id); if (goal.projectId) setProjectId(goal.projectId); }} />)}</ChoiceRow>
                  <ChoiceRow label="VISIBILITY">{visibilityOptions.map((option) => <Choice active={option.id === visibility} key={option.id} label={option.label} onPress={() => setVisibility(option.id)} />)}</ChoiceRow>
                </> : null}
                <View style={{ alignItems: compact ? 'stretch' : 'center', flexDirection: compact ? 'column' : 'row', gap: SPACE.lg, justifyContent: 'space-between' }}>{!editingEntry?.echoOwned ? <View style={{ alignItems: 'center', flexDirection: 'row', gap: SPACE.sm }}><Ionicons color={colors.text.accent} name="lock-closed-outline" size={16} /><Typography variant="caption">Private is always the default.</Typography></View> : <View />}<Button disabled={!body.trim()} loading={saving} onPress={() => void saveJournalEntry()}>{editingEntry ? 'Save Changes' : 'Save Entry'}</Button></View>
                {saveError ? <Typography accessibilityRole="alert" variant="caption" style={{ color: colors.feedback.danger.text }}>{saveError}</Typography> : null}
              </View>
            ) : null}

            <View style={{ gap: SPACE['3xl'] }}>
              {loading && !entries.length ? <View style={{ alignItems: 'center', paddingVertical: SPACE['6xl'] }}><ActivityIndicator color={colors.accent.primary} /><Typography variant="caption" style={{ marginTop: SPACE.md }}>Loading Journal…</Typography></View> : grouped.length ? grouped.map((group) => (
                <View key={group.label} style={{ gap: SPACE.lg }}>
                  <Typography variant="eyebrow" style={{ color: colors.text.secondary, letterSpacing: 1.4 }}>{group.label}</Typography>
                  {group.items.map((entry) => {
                    const highlighted = entry.id === selectedEntryId;
                    return <View accessibilityLabel={`Journal entry: ${entry.title}`} key={entry.id} style={{ backgroundColor: highlighted ? colors.background.selectedRow : colors.background.card, borderColor: highlighted ? colors.border.accent : colors.border.warmSubtle, borderRadius: RADIUS.xl, borderWidth: 1, padding: compact ? SPACE.xl : SPACE['3xl'] }}>
                      <View style={{ alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' }}><Typography variant="caption" style={{ color: colors.text.secondary }}>{timeLabel(new Date(entry.createdAt))}</Typography><Pressable accessibilityLabel="Journal entry actions" accessibilityRole="button" onPress={() => setMenuEntryId(menuEntryId === entry.id ? null : entry.id)} style={{ alignItems: 'center', height: 38, justifyContent: 'center', width: 38 }}><Ionicons color={colors.text.secondary} name="ellipsis-horizontal" size={20} /></Pressable></View>
                      {menuEntryId === entry.id ? <View style={{ alignSelf: 'flex-end', backgroundColor: colors.background.input, borderColor: colors.border.input, borderRadius: RADIUS.md, borderWidth: 1, gap: SPACE.xs, marginBottom: SPACE.lg, padding: SPACE.sm }}><Button onPress={() => editJournalEntry(entry)} size="compact" variant="ghost">Edit Entry</Button><Button onPress={() => { setMenuEntryId(null); setDeleteTarget(entry); }} size="compact" variant="danger">Delete</Button></View> : null}
                      <Typography style={{ color: colors.text.primary, fontFamily: FONT.editorial.regular, fontSize: compact ? 17 : 19, lineHeight: compact ? 28 : 31 }}>{entry.plainText}</Typography>
                      {(entry.project || entry.goals.length) ? <View style={{ alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.sm, marginTop: SPACE['2xl'] }}>{entry.project ? <Pressable accessibilityRole="link" onPress={() => router.push(`/(app)/projects/${entry.project!.id}` as never)}><Typography variant="emphasis-sm" style={{ color: colors.text.accent }}>{entry.project.title}</Typography></Pressable> : null}{entry.project && entry.goals.length ? <Typography variant="caption">·</Typography> : null}{entry.goals.map((goal) => <Pressable accessibilityRole="link" key={goal.id} onPress={() => router.push(goalWorkspaceHref(goal.id, 'active', entry.project?.id ? { projectId: entry.project.id } : undefined) as never)}><Typography variant="emphasis-sm" style={{ color: colors.text.accent }}>{goal.title}</Typography></Pressable>)}</View> : null}
                      <View style={{ alignItems: 'center', borderTopColor: colors.border.divider, borderTopWidth: 1, flexDirection: 'row', gap: SPACE.sm, marginTop: SPACE['2xl'], paddingTop: SPACE.lg }}><Ionicons color={colors.text.muted} name={entry.shareScope === 'private' ? 'lock-closed-outline' : 'people-outline'} size={15} /><Typography variant="caption" style={{ color: colors.text.secondary }}>{visibilityLabel(entry.shareScope)}</Typography>{entry.updatedAt !== entry.createdAt ? <Typography variant="caption" style={{ color: colors.text.muted }}>· Edited {new Date(entry.updatedAt).toLocaleDateString()}</Typography> : null}</View>
                    </View>;
                  })}
                </View>
              )) : <View style={{ alignItems: 'center', backgroundColor: colors.background.card, borderColor: colors.border.warmSubtle, borderRadius: RADIUS.xl, borderWidth: 1, padding: SPACE['5xl'] }}><BrandIcon color={colors.text.accent} name="reflections" size={36} /><Typography variant="title" style={{ marginTop: SPACE.xl, textAlign: 'center' }}>{emptyTitle()}</Typography>{context.kind === 'all' && !query ? <Button onPress={startEntry} style={{ marginTop: SPACE.xl }}>New Entry</Button> : null}</View>}
              {loadError ? <View style={{ alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.md }}><Typography accessibilityRole="alert" variant="caption" style={{ color: colors.feedback.danger.text }}>{loadError}</Typography><Button onPress={() => void loadJournal()} size="compact" variant="secondary">Retry</Button></View> : null}
            </View>
          </View>
        </View>
      </View>

      <Modal visible={browseOpen} onClose={() => setBrowseOpen(false)} closeOnBackdropPress contentStyle={{ maxHeight: '84%', maxWidth: 520 }}>
        <Typography variant="title">Browse Journal</Typography>
        <ScrollView contentContainerStyle={{ gap: SPACE.sm, marginTop: SPACE.lg }} showsVerticalScrollIndicator={false}>{browseContent}</ScrollView>
        {!browseAvailable ? <Typography accessibilityRole="alert" variant="caption" style={{ color: colors.feedback.pending.text, marginTop: SPACE.md }}>Browse context is temporarily unavailable. Your Journal is still here.</Typography> : null}
      </Modal>

      <Modal visible={filtersOpen} onClose={() => setFiltersOpen(false)} closeOnBackdropPress contentStyle={{ maxWidth: 520 }}>
        <Typography variant="title">Filter Journal</Typography>
        <View style={{ gap: SPACE.xl, marginTop: SPACE.xl }}>
          <ChoiceRow label="SHARING">{([
            ['all', 'All visibility'],
            ['private', 'Private to me'],
            ['project', 'Shared with Project'],
            ['guide', 'Shared with Guide'],
          ] as Array<[JournalShareFilter, string]>).map(([id, label]) => <Choice active={filters.share === id} key={id} label={label} onPress={() => setFilters((current) => ({ ...current, share: id }))} />)}</ChoiceRow>
          <ChoiceRow label="DATE">{([
            ['all', 'Any time'],
            ['7d', 'Last 7 days'],
            ['30d', 'Last 30 days'],
            ['90d', 'Last 90 days'],
          ] as Array<[JournalDateRange, string]>).map(([id, label]) => <Choice active={filters.dateRange === id} key={id} label={label} onPress={() => setFilters((current) => ({ ...current, dateRange: id }))} />)}</ChoiceRow>
          <View style={{ alignItems: 'center', flexDirection: 'row', gap: SPACE.md, justifyContent: 'space-between' }}><Button onPress={() => setFilters(EMPTY_JOURNAL_FILTERS)} size="compact" variant="ghost">Clear filters</Button><Button onPress={() => setFiltersOpen(false)} size="compact">Show entries</Button></View>
        </View>
      </Modal>

      <Modal cancelText="Cancel" closeOnBackdropPress confirmText={saving ? 'Deleting…' : 'Delete Entry'} confirmDisabled={saving} onCancel={() => setDeleteTarget(null)} onClose={() => setDeleteTarget(null)} onConfirm={() => void removeJournalEntry()} visible={Boolean(deleteTarget)}>
        <Typography variant="title">Delete this Journal entry?</Typography>
        <Typography variant="body" style={{ marginTop: SPACE.md }}>This permanently removes the entry. Its original date and links cannot be recovered.</Typography>
      </Modal>
    </AuthenticatedPageShell>
  );
}
