import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { BrandIcon } from '@/components/ui/BrandIcon';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { OverflowMenu } from '@/components/ui/OverflowMenu';
import { Typography } from '@/components/ui/Typography';
import { LAYOUT, RADIUS, SPACE, TYPE } from '@/constants/design';
import { goalWorkspaceHref } from '@/features/goals/navigation';
import { useThemeColors } from '@/store/uiStore';
import {
  assignNoteFolder,
  createNoteFolder,
  deleteEntry,
  deleteNoteFolder,
  fetchNotesLibrary,
  renameNoteFolder,
} from '../services/entry-service';
import type {
  EntryProjectLink,
  NoteFolder,
  NotesLibraryItem,
  NotesLibraryPayload,
  NotesLibrarySort,
  NotesLibrarySource,
  NotesLibraryView,
} from '../types';
import {
  countActiveFilters,
  EMPTY_NOTES_LIBRARY_FILTERS,
  selectNotesLibraryItems,
  selectNotesLibrarySources,
  type NotesLibraryFilters,
} from '../notes-library';
import { EchoCreationModal } from './EchoCreationModal';

const TABS: ReadonlyArray<{ id: NotesLibraryView; label: string; icon?: keyof typeof Ionicons.glyphMap }> = [
  { id: 'my-library', label: 'My Library' },
  { id: 'shared-with-me', label: 'Shared with Me' },
  { id: 'linked-to', label: 'Linked' },
  { id: 'sources', label: 'Sources', icon: 'document-attach-outline' },
];

const SORTS: ReadonlyArray<{ id: NotesLibrarySort; label: string }> = [
  { id: 'updated-desc', label: 'Last updated' },
  { id: 'created-desc', label: 'Created date' },
  { id: 'title-asc', label: 'Alphabetical' },
];

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function viewParam(value: string | undefined): NotesLibraryView {
  return TABS.some((tab) => tab.id === value) ? value as NotesLibraryView : 'my-library';
}

function dateLabel(value: string): string {
  const date = new Date(value);
  const difference = Date.now() - date.getTime();
  if (difference >= 0 && difference < 60_000) return 'Now';
  if (difference >= 0 && difference < 3_600_000) return `${Math.max(1, Math.floor(difference / 60_000))}m ago`;
  if (difference >= 0 && difference < 86_400_000) return `${Math.floor(difference / 3_600_000)}h ago`;
  if (difference >= 0 && difference < 604_800_000) return `${Math.floor(difference / 86_400_000)}d ago`;
  const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  if (date.getFullYear() !== new Date().getFullYear()) options.year = 'numeric';
  return date.toLocaleDateString('en-US', options);
}

function relationshipLabel(item: NotesLibraryItem | NotesLibrarySource): string[] {
  const labels: string[] = [];
  if (item.project?.title) labels.push(item.project.title);
  if ('goals' in item) labels.push(...item.goals.map((goal) => goal.title));
  else if (item.goal?.title) labels.push(item.goal.title);
  return [...new Set(labels)];
}

function FilterChoice({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  const colors = useThemeColors();
  return <Pressable accessibilityRole="button" accessibilityState={{ selected }} onPress={onPress} style={({ pressed }) => ({ backgroundColor: selected ? colors.background.selectedRow : colors.background.input, borderColor: selected ? colors.border.accent : colors.border.input, borderRadius: RADIUS.round, borderWidth: 1, minHeight: 38, justifyContent: 'center', opacity: pressed ? 0.7 : 1, paddingHorizontal: SPACE.lg })}><Typography variant="body-small" style={{ color: selected ? colors.text.accent : colors.text.secondary }}>{label}</Typography></Pressable>;
}

function FolderTile({ label, selected, onPress, dashed = false }: { label: string; selected: boolean; onPress: () => void; dashed?: boolean }) {
  const colors = useThemeColors();
  return <Pressable accessibilityLabel={`Show ${label}`} accessibilityRole="button" accessibilityState={{ selected }} onPress={onPress} style={({ hovered, pressed }) => ({ alignItems: 'center', backgroundColor: selected ? colors.background.selectedRow : hovered ? colors.background.hoverAccent : colors.background.card, borderColor: selected ? colors.border.accent : colors.border.input, borderRadius: RADIUS.md, borderStyle: dashed ? 'dashed' : 'solid', borderWidth: 1, flexDirection: 'row', gap: SPACE.md, minHeight: 54, minWidth: 150, opacity: pressed ? 0.72 : 1, paddingHorizontal: SPACE.xl })}><Ionicons color={selected ? colors.text.accent : colors.text.secondary} name={dashed ? 'add' : 'folder-outline'} size={20} /><Typography numberOfLines={1} variant="emphasis-sm" style={{ color: selected ? colors.text.accent : colors.text.primary, flex: 1 }}>{label}</Typography></Pressable>;
}

function RelationshipLinks({ item }: { item: NotesLibraryItem | NotesLibrarySource }) {
  const colors = useThemeColors();
  const labels = relationshipLabel(item);
  if (!labels.length) return <Typography variant="caption">—</Typography>;
  return <View style={{ alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.xs }}>
    {item.project ? <Pressable accessibilityLabel={`Open Project ${item.project.title}`} accessibilityRole="link" onPress={() => router.push(`/(app)/projects/${item.project!.id}` as never)} style={({ pressed }) => ({ backgroundColor: colors.background.selectedRow, borderRadius: RADIUS.round, opacity: pressed ? 0.65 : 1, paddingHorizontal: SPACE.md, paddingVertical: SPACE.xs })}><Typography numberOfLines={1} variant="caption" style={{ color: colors.text.accent }}>{item.project.title}</Typography></Pressable> : null}
    {'goals' in item ? item.goals.map((goal) => <Pressable accessibilityLabel={`Open Goal ${goal.title}`} accessibilityRole="link" key={goal.id} onPress={() => router.push(goalWorkspaceHref(goal.id) as never)} style={({ pressed }) => ({ backgroundColor: colors.background.input, borderRadius: RADIUS.round, opacity: pressed ? 0.65 : 1, paddingHorizontal: SPACE.md, paddingVertical: SPACE.xs })}><Typography numberOfLines={1} variant="caption">{goal.title}</Typography></Pressable>) : item.goal ? <Pressable accessibilityLabel={`Open Goal ${item.goal.title}`} accessibilityRole="link" onPress={() => router.push(goalWorkspaceHref(item.goal!.id) as never)} style={({ pressed }) => ({ backgroundColor: colors.background.input, borderRadius: RADIUS.round, opacity: pressed ? 0.65 : 1, paddingHorizontal: SPACE.md, paddingVertical: SPACE.xs })}><Typography numberOfLines={1} variant="caption">{item.goal.title}</Typography></Pressable> : null}
  </View>;
}

function NoteRow({ compact, folder, note, onDelete, onMove }: { compact: boolean; folder: NoteFolder | null; note: NotesLibraryItem; onDelete: () => void; onMove: () => void }) {
  const colors = useThemeColors();
  const shared = note.viewerRole !== 'owner';
  const open = () => router.push({ pathname: '/(app)/notes/[id]', params: { id: note.id, from: 'library' } } as never);
  return <View>
    <View style={{ alignItems: compact ? 'flex-start' : 'center', backgroundColor: colors.background.card, borderBottomColor: colors.border.divider, borderBottomWidth: 1, flexDirection: compact ? 'column' : 'row', gap: compact ? SPACE.md : SPACE.xl, minHeight: compact ? 126 : 72, paddingHorizontal: compact ? SPACE.lg : SPACE.xl, paddingVertical: SPACE.md }}>
      <View style={{ alignItems: 'center', flexDirection: 'row', flex: compact ? undefined : 1.35, gap: SPACE.md, minWidth: 0, width: compact ? '100%' : undefined }}>
        <View style={{ alignItems: 'center', backgroundColor: colors.background.input, borderColor: colors.border.input, borderRadius: RADIUS.md, borderWidth: 1, height: 42, justifyContent: 'center', width: 42 }}><BrandIcon color={colors.text.accent} name="notes" size={19} /></View>
        <Pressable accessibilityLabel={`Open Note ${note.title || 'Untitled note'}`} accessibilityRole="link" onPress={open} style={({ pressed }) => ({ flex: 1, minWidth: 0, opacity: pressed ? 0.65 : 1 })}>
          <Typography numberOfLines={1} variant="emphasis-sm">{note.title.trim() || 'Untitled note'}</Typography>
          <Typography numberOfLines={1} variant="caption" style={{ marginTop: 3 }}>{shared ? `${note.author.displayName} · ` : ''}{folder?.name ?? 'Unfiled'}{note.shareScope !== 'private' ? ` · Shared with ${note.shareScope === 'guide' ? 'Guide' : 'Project'}` : ''}</Typography>
        </Pressable>
      </View>
      <View style={{ flex: compact ? undefined : 1.15, minWidth: 0, width: compact ? '100%' : undefined }}><RelationshipLinks item={note} /></View>
      <View style={{ alignItems: 'center', alignSelf: compact ? 'stretch' : undefined, flexDirection: 'row', gap: SPACE.lg, justifyContent: compact ? 'space-between' : 'flex-end', minWidth: compact ? 0 : 140 }}><Typography variant="caption">{dateLabel(note.updatedAt)}</Typography><OverflowMenu accessibilityLabel={`Actions for ${note.title || 'Untitled note'}`} actions={[
        { key: 'open', label: 'Open', onPress: open },
        { key: 'folder', label: 'Move to folder', onPress: onMove },
        ...(note.capabilities.canDelete ? [{ key: 'delete', label: 'Delete', destructive: true, onPress: onDelete }] : []),
      ]} /></View>
    </View>
  </View>;
}

function SourceRow({ compact, source }: { compact: boolean; source: NotesLibrarySource }) {
  const colors = useThemeColors();
  const open = () => { if (source.url) void Linking.openURL(source.url); };
  return <View style={{ alignItems: compact ? 'flex-start' : 'center', backgroundColor: colors.background.card, borderBottomColor: colors.border.divider, borderBottomWidth: 1, flexDirection: compact ? 'column' : 'row', gap: compact ? SPACE.md : SPACE.xl, minHeight: compact ? 118 : 72, paddingHorizontal: compact ? SPACE.lg : SPACE.xl, paddingVertical: SPACE.md }}>
    <View style={{ alignItems: 'center', flexDirection: 'row', flex: compact ? undefined : 1.35, gap: SPACE.md, minWidth: 0, width: compact ? '100%' : undefined }}>
      <View style={{ alignItems: 'center', backgroundColor: colors.background.input, borderRadius: RADIUS.md, height: 42, justifyContent: 'center', width: 42 }}><Ionicons color={colors.text.accent} name={source.itemType === 'link' ? 'link-outline' : 'document-attach-outline'} size={20} /></View>
      <Pressable accessibilityLabel={`${source.url ? 'Open' : 'View'} Source ${source.title}`} accessibilityRole={source.url ? 'link' : 'button'} disabled={!source.url} onPress={open} style={({ pressed }) => ({ flex: 1, minWidth: 0, opacity: pressed ? 0.65 : 1 })}><Typography numberOfLines={1} variant="emphasis-sm">{source.title}</Typography><Typography numberOfLines={1} variant="caption" style={{ marginTop: 3 }}>{source.provider} · {source.author.displayName}</Typography></Pressable>
    </View>
    <View style={{ flex: compact ? undefined : 1.15, minWidth: 0, width: compact ? '100%' : undefined }}><RelationshipLinks item={source} /></View>
    <View style={{ alignItems: 'center', alignSelf: compact ? 'stretch' : undefined, flexDirection: 'row', justifyContent: compact ? 'space-between' : 'flex-end', minWidth: compact ? 0 : 140 }}><Typography variant="caption">{dateLabel(source.updatedAt)}</Typography>{source.url ? <Ionicons color={colors.text.muted} name="open-outline" size={17} /> : null}</View>
  </View>;
}

export function NotesLibraryScreen() {
  const colors = useThemeColors();
  const { width } = useWindowDimensions();
  const compact = width < 760;
  const params = useLocalSearchParams<{ create?: string | string[]; goalId?: string | string[]; projectId?: string | string[]; view?: string | string[] }>();
  const requestedCreation = firstParam(params.create);
  const [payload, setPayload] = useState<NotesLibraryPayload | null>(null);
  const [view, setView] = useState<NotesLibraryView>(viewParam(firstParam(params.view)));
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<NotesLibrarySort>('updated-desc');
  const [filters, setFilters] = useState<NotesLibraryFilters>(EMPTY_NOTES_LIBRARY_FILTERS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creationOpen, setCreationOpen] = useState(requestedCreation === 'note');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [foldersOpen, setFoldersOpen] = useState(false);
  const [folderName, setFolderName] = useState('');
  const [editingFolder, setEditingFolder] = useState<NoteFolder | null>(null);
  const [folderBusy, setFolderBusy] = useState(false);
  const [folderError, setFolderError] = useState<string | null>(null);
  const [deleteFolderTarget, setDeleteFolderTarget] = useState<NoteFolder | null>(null);
  const [moveTarget, setMoveTarget] = useState<NotesLibraryItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<NotesLibraryItem | null>(null);

  async function load() {
    setError(null);
    try { setPayload(await fetchNotesLibrary()); }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Notes library could not be loaded.'); }
    finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, []);
  useEffect(() => { if (requestedCreation === 'note') setCreationOpen(true); }, [requestedCreation]);

  const folders = payload?.folders ?? [];
  const folderById = useMemo(() => new Map(folders.map((folder) => [folder.id, folder])), [folders]);
  const notes = useMemo(() => payload && view !== 'sources' ? selectNotesLibraryItems({ notes: payload.notes, folders, viewerId: payload.viewerId, view, query, sort, filters }) : [], [filters, folders, payload, query, sort, view]);
  const sources = useMemo(() => payload && view === 'sources' ? selectNotesLibrarySources({ sources: payload.sources, query, sort, filters }) : [], [filters, payload, query, sort, view]);
  const resultCount = view === 'sources' ? sources.length : notes.length;
  const activeFilters = countActiveFilters(filters);
  const projects = useMemo(() => {
    const values = [...(payload?.notes ?? []).map((item) => item.project), ...(payload?.sources ?? []).map((item) => item.project)]
      .filter((item): item is EntryProjectLink => item !== null);
    return [...new Map(values.map((item) => [item.id, item])).values()];
  }, [payload]);
  const goals = useMemo(() => {
    const values = [...(payload?.notes ?? []).flatMap((item) => item.goals), ...(payload?.sources ?? []).flatMap((item) => item.goal ? [item.goal] : [])];
    return [...new Map(values.map((item) => [item.id, item])).values()];
  }, [payload]);
  const authors = useMemo(() => {
    const values = [...(payload?.notes ?? []).map((item) => item.author), ...(payload?.sources ?? []).map((item) => item.author)];
    return [...new Map(values.map((item) => [item.id, item])).values()];
  }, [payload]);
  const providers = useMemo(() => [...new Set((payload?.sources ?? []).map((item) => item.provider))], [payload]);

  function selectView(next: NotesLibraryView) {
    setView(next); setFilters(EMPTY_NOTES_LIBRARY_FILTERS); setQuery('');
    router.setParams({ view: next });
  }

  function selectFolder(folderId: string | 'unfiled' | null) {
    setFilters((current) => ({ ...current, folderId }));
  }

  async function saveFolder() {
    if (!folderName.trim() || folderBusy) return;
    setFolderBusy(true); setFolderError(null);
    try {
      if (editingFolder) await renameNoteFolder(editingFolder.id, folderName);
      else await createNoteFolder(folderName);
      setFolderName(''); setEditingFolder(null); await load();
    } catch (caught) { setFolderError(caught instanceof Error ? caught.message : 'Folder could not be saved.'); }
    finally { setFolderBusy(false); }
  }

  async function confirmDeleteFolder() {
    if (!deleteFolderTarget || folderBusy) return;
    setFolderBusy(true);
    try { await deleteNoteFolder(deleteFolderTarget.id); setDeleteFolderTarget(null); selectFolder(null); await load(); }
    catch (caught) { setFolderError(caught instanceof Error ? caught.message : 'Folder could not be deleted.'); }
    finally { setFolderBusy(false); }
  }

  async function moveNote(folderId: string | null) {
    if (!moveTarget || folderBusy) return;
    setFolderBusy(true); setFolderError(null);
    try { await assignNoteFolder(moveTarget.id, folderId); setMoveTarget(null); await load(); }
    catch (caught) { setFolderError(caught instanceof Error ? caught.message : 'Note could not be moved.'); }
    finally { setFolderBusy(false); }
  }

  async function confirmDeleteNote() {
    if (!deleteTarget) return;
    try { await deleteEntry(deleteTarget.id); setDeleteTarget(null); await load(); }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Note could not be deleted.'); }
  }

  const emptyTitle = query ? 'No matching results' : view === 'my-library' ? 'No Notes yet' : view === 'shared-with-me' ? 'Nothing shared with you yet' : view === 'linked-to' ? 'No linked Notes yet' : 'No Sources yet';
  const emptyBody = query ? 'Try a different search or clear your filters.' : view === 'my-library' ? 'Create a Note to start capturing ideas, research, or plans.' : view === 'linked-to' ? 'Link a Note to a Goal or Project to see it here.' : view === 'sources' ? 'Authorized links, PDFs, documents, and media from your Vaults will appear here.' : '';

  return <ScrollView style={{ flex: 1, backgroundColor: colors.background.page }} contentContainerStyle={{ alignSelf: 'center', gap: SPACE['2xl'], maxWidth: LAYOUT.contentMaxWidth, paddingHorizontal: compact ? SPACE.xl : LAYOUT.wideGutter, paddingVertical: compact ? SPACE.xl : SPACE['3xl'], width: '100%' }} keyboardShouldPersistTaps="handled">
    <View style={{ alignItems: compact ? 'stretch' : 'flex-start', flexDirection: compact ? 'column' : 'row', gap: SPACE.xl, justifyContent: 'space-between' }}>
      <View style={{ gap: SPACE.xs }}><View style={{ alignItems: 'center', flexDirection: 'row', gap: SPACE.md }}><BrandIcon color={colors.accent.primary} name="notes" size={27} /><Typography accessibilityRole="header" variant="heading">Notes</Typography></View><Typography variant="body">Capture your thinking, develop ideas, and keep what matters easy to find.</Typography></View>
      <Button leftIcon={<Ionicons color={colors.text.onAccent} name="add" size={18} />} onPress={() => setCreationOpen(true)}>New Note</Button>
    </View>

    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: SPACE.xs }} accessibilityRole="tablist">
      {TABS.map((tab) => { const selected = tab.id === view; return <Pressable accessibilityRole="tab" accessibilityState={{ selected }} key={tab.id} onPress={() => selectView(tab.id)} style={({ pressed }) => ({ alignItems: 'center', backgroundColor: selected ? colors.accent.primary : 'transparent', borderColor: selected ? colors.accent.primary : colors.border.divider, borderRadius: RADIUS.round, borderWidth: 1, flexDirection: 'row', gap: SPACE.sm, minHeight: 44, opacity: pressed ? 0.72 : 1, paddingHorizontal: SPACE.xl })}>{tab.icon ? <Ionicons color={selected ? colors.text.onAccent : colors.text.secondary} name={tab.icon} size={17} /> : null}<Typography variant="emphasis-sm" style={{ color: selected ? colors.text.onAccent : colors.text.secondary }}>{tab.label}</Typography>{tab.id === 'sources' && payload ? <View style={{ backgroundColor: selected ? colors.background.card : colors.background.input, borderRadius: RADIUS.round, paddingHorizontal: SPACE.sm, paddingVertical: 2 }}><Typography variant="meta" style={{ color: selected ? colors.text.accent : colors.text.secondary }}>{payload.sources.length}</Typography></View> : null}</Pressable>; })}
    </ScrollView>

    {view !== 'sources' ? <View style={{ backgroundColor: colors.background.card, borderColor: colors.border.divider, borderRadius: RADIUS.xl, borderWidth: 1, gap: SPACE.lg, padding: compact ? SPACE.lg : SPACE.xl }}>
      <Typography variant="eyebrow">FOLDERS</Typography>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: SPACE.md }}>
        <FolderTile label="All Notes" selected={filters.folderId === null} onPress={() => selectFolder(null)} />
        {folders.map((folder) => <FolderTile key={folder.id} label={folder.name} selected={filters.folderId === folder.id} onPress={() => selectFolder(folder.id)} />)}
        <FolderTile label="Unfiled" selected={filters.folderId === 'unfiled'} onPress={() => selectFolder('unfiled')} />
        <FolderTile dashed label="New folder" selected={false} onPress={() => { setFoldersOpen(true); setEditingFolder(null); setFolderName(''); setFolderError(null); }} />
      </ScrollView>
    </View> : null}

    <View style={{ alignItems: compact ? 'stretch' : 'center', flexDirection: compact ? 'column' : 'row', gap: SPACE.md, justifyContent: 'space-between' }}>
      <View style={{ alignItems: 'center', backgroundColor: colors.background.input, borderColor: colors.border.input, borderRadius: RADIUS.md, borderWidth: 1, flexDirection: 'row', maxWidth: compact ? undefined : 430, minHeight: 46, paddingHorizontal: SPACE.lg, width: compact ? '100%' : 430 }}><Ionicons color={colors.text.muted} name="search-outline" size={19} /><TextInput accessibilityLabel={`Search ${view === 'sources' ? 'Sources' : 'Notes'}`} onChangeText={setQuery} placeholder={view === 'sources' ? 'Search Sources…' : 'Search Notes…'} placeholderTextColor={colors.text.muted} style={{ ...TYPE.bodySmall, color: colors.text.primary, flex: 1, minHeight: 44, outlineStyle: 'solid', outlineWidth: 0, paddingHorizontal: SPACE.md }} value={query} /></View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.sm }}>
        <Button leftIcon={<Ionicons color={colors.text.secondary} name="swap-vertical-outline" size={16} />} onPress={() => setSortOpen(true)} size="compact" variant="secondary">{SORTS.find((option) => option.id === sort)?.label}</Button>
        <Button leftIcon={<Ionicons color={colors.text.secondary} name="options-outline" size={16} />} onPress={() => setFiltersOpen(true)} size="compact" variant="secondary">Filters{activeFilters ? ` (${activeFilters})` : ''}</Button>
      </View>
    </View>

    <View accessibilityLabel={`${resultCount} ${view === 'sources' ? 'Sources' : 'Notes'} shown`} accessibilityLiveRegion="polite" style={{ backgroundColor: colors.background.card, borderColor: colors.border.divider, borderRadius: RADIUS.xl, borderWidth: 1, overflow: 'hidden' }}>
      {!compact && !loading && resultCount ? <View style={{ alignItems: 'center', backgroundColor: colors.background.subtle, borderBottomColor: colors.border.divider, borderBottomWidth: 1, flexDirection: 'row', gap: SPACE.xl, minHeight: 46, paddingHorizontal: SPACE.xl }}><Typography variant="micro-label" style={{ flex: 1.35 }}>NAME</Typography><Typography variant="micro-label" style={{ flex: 1.15 }}>LINKED TO</Typography><Typography variant="micro-label" style={{ minWidth: 140, textAlign: 'right' }}>LAST UPDATED</Typography></View> : null}
      {loading ? <View style={{ alignItems: 'center', gap: SPACE.md, padding: SPACE['5xl'] }}><ActivityIndicator color={colors.accent.primary} /><Typography variant="caption">Loading Notes…</Typography></View> : error ? <View accessibilityRole="alert" style={{ alignItems: 'center', gap: SPACE.lg, padding: SPACE['4xl'] }}><Typography variant="title">Notes couldn’t load</Typography><Typography variant="body">{error}</Typography><Button onPress={() => { setLoading(true); void load(); }} variant="secondary">Retry</Button></View> : resultCount ? view === 'sources' ? sources.map((source) => <SourceRow compact={compact} key={source.id} source={source} />) : notes.map((note) => <NoteRow compact={compact} folder={note.folderId ? folderById.get(note.folderId) ?? null : null} key={note.id} note={note} onDelete={() => setDeleteTarget(note)} onMove={() => setMoveTarget(note)} />) : <View style={{ alignItems: 'center', gap: SPACE.md, paddingHorizontal: SPACE.xl, paddingVertical: SPACE['5xl'] }}><BrandIcon color={colors.text.accent} name="notes" size={28} /><Typography variant="title" style={{ textAlign: 'center' }}>{emptyTitle}</Typography>{emptyBody ? <Typography variant="body" style={{ maxWidth: 440, textAlign: 'center' }}>{emptyBody}</Typography> : null}{view === 'my-library' && !query ? <Button onPress={() => setCreationOpen(true)} size="compact">New Note</Button> : null}</View>}
    </View>

    <EchoCreationModal initialGoalId={firstParam(params.goalId)} initialProjectId={firstParam(params.projectId)} initialType="note" onClose={() => { setCreationOpen(false); if (requestedCreation) router.setParams({ create: undefined }); }} onCreated={(entryId) => { setCreationOpen(false); router.replace({ pathname: '/(app)/notes/[id]', params: { id: entryId, from: 'library', goalId: firstParam(params.goalId), projectId: firstParam(params.projectId) } } as never); }} visible={creationOpen} />

    <Modal visible={sortOpen} onClose={() => setSortOpen(false)} contentStyle={{ maxWidth: 420 }}><View style={{ gap: SPACE.md }}><Typography variant="title">Sort Notes</Typography>{SORTS.map((option) => <FilterChoice key={option.id} label={option.label} selected={sort === option.id} onPress={() => { setSort(option.id); setSortOpen(false); }} />)}</View></Modal>

    <Modal visible={filtersOpen} onClose={() => setFiltersOpen(false)} contentStyle={{ maxHeight: '88%', maxWidth: 620 }}><ScrollView contentContainerStyle={{ gap: SPACE.xl }}><View style={{ alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' }}><Typography variant="title">Filters</Typography><Pressable accessibilityRole="button" onPress={() => setFilters(EMPTY_NOTES_LIBRARY_FILTERS)}><Typography variant="emphasis-sm" style={{ color: colors.text.accent }}>Clear all</Typography></Pressable></View>
      {projects.length ? <View style={{ gap: SPACE.sm }}><Typography variant="eyebrow">PROJECT</Typography><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.sm }}><FilterChoice label="Any Project" selected={!filters.projectId} onPress={() => setFilters((current) => ({ ...current, projectId: null }))} />{projects.map((project) => <FilterChoice key={project.id} label={project.title} selected={filters.projectId === project.id} onPress={() => setFilters((current) => ({ ...current, projectId: project.id }))} />)}</View></View> : null}
      {goals.length ? <View style={{ gap: SPACE.sm }}><Typography variant="eyebrow">GOAL</Typography><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.sm }}><FilterChoice label="Any Goal" selected={!filters.goalId} onPress={() => setFilters((current) => ({ ...current, goalId: null }))} />{goals.map((goal) => <FilterChoice key={goal.id} label={goal.title} selected={filters.goalId === goal.id} onPress={() => setFilters((current) => ({ ...current, goalId: goal.id }))} />)}</View></View> : null}
      {(view === 'shared-with-me' || view === 'sources') && authors.length ? <View style={{ gap: SPACE.sm }}><Typography variant="eyebrow">AUTHOR / OWNER</Typography><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.sm }}><FilterChoice label="Anyone" selected={!filters.authorId} onPress={() => setFilters((current) => ({ ...current, authorId: null }))} />{authors.map((author) => <FilterChoice key={author.id} label={author.displayName} selected={filters.authorId === author.id} onPress={() => setFilters((current) => ({ ...current, authorId: author.id }))} />)}</View></View> : null}
      <View style={{ gap: SPACE.sm }}><Typography variant="eyebrow">DATE UPDATED</Typography><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.sm }}><FilterChoice label="Any time" selected={!filters.dateRange} onPress={() => setFilters((current) => ({ ...current, dateRange: null }))} /><FilterChoice label="Past 7 days" selected={filters.dateRange === '7-days'} onPress={() => setFilters((current) => ({ ...current, dateRange: '7-days' }))} /><FilterChoice label="Past 30 days" selected={filters.dateRange === '30-days'} onPress={() => setFilters((current) => ({ ...current, dateRange: '30-days' }))} /></View></View>
      {view !== 'sources' ? <View style={{ gap: SPACE.sm }}><Typography variant="eyebrow">SHARING</Typography><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.sm }}>{(['private', 'project', 'guide'] as const).map((scope) => <FilterChoice key={scope} label={scope === 'private' ? 'Private' : scope === 'project' ? 'Shared with Project' : 'Shared with Guide'} selected={filters.shareScope === scope} onPress={() => setFilters((current) => ({ ...current, shareScope: current.shareScope === scope ? null : scope }))} />)}</View></View> : <><View style={{ gap: SPACE.sm }}><Typography variant="eyebrow">TYPE</Typography><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.sm }}>{(['link', 'document'] as const).map((type) => <FilterChoice key={type} label={type === 'link' ? 'Web link' : 'Document / file'} selected={filters.sourceType === type} onPress={() => setFilters((current) => ({ ...current, sourceType: current.sourceType === type ? null : type }))} />)}</View></View>{providers.length ? <View style={{ gap: SPACE.sm }}><Typography variant="eyebrow">PROVIDER</Typography><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.sm }}>{providers.map((provider) => <FilterChoice key={provider} label={provider} selected={filters.provider === provider} onPress={() => setFilters((current) => ({ ...current, provider: current.provider === provider ? null : provider }))} />)}</View></View> : null}</>}
      <Button onPress={() => setFiltersOpen(false)}>Show {resultCount} result{resultCount === 1 ? '' : 's'}</Button>
    </ScrollView></Modal>

    <Modal visible={foldersOpen} onClose={() => setFoldersOpen(false)} contentStyle={{ maxHeight: '88%', maxWidth: 560 }}><ScrollView contentContainerStyle={{ gap: SPACE.xl }}><Typography variant="title">Manage folders</Typography><Typography variant="body-small">Folders are personal organization. They do not change sharing or Project and Goal links.</Typography><View style={{ flexDirection: 'row', gap: SPACE.sm }}><TextInput accessibilityLabel="Folder name" autoFocus onChangeText={setFolderName} placeholder="Folder name" placeholderTextColor={colors.text.muted} style={{ ...TYPE.bodySmall, backgroundColor: colors.background.input, borderColor: colors.border.input, borderRadius: RADIUS.md, borderWidth: 1, color: colors.text.primary, flex: 1, minHeight: 44, outlineStyle: 'solid', outlineWidth: 0, paddingHorizontal: SPACE.lg }} value={folderName} /><Button disabled={!folderName.trim() || folderBusy} onPress={() => void saveFolder()} size="compact">{editingFolder ? 'Rename' : 'Add'}</Button></View>{folderError ? <Typography accessibilityRole="alert" variant="caption" style={{ color: colors.feedback.danger.text }}>{folderError}</Typography> : null}<View style={{ gap: SPACE.sm }}>{folders.map((folder) => <View key={folder.id} style={{ alignItems: 'center', backgroundColor: colors.background.input, borderRadius: RADIUS.md, flexDirection: 'row', gap: SPACE.md, minHeight: 52, paddingHorizontal: SPACE.lg }}><Ionicons color={colors.text.secondary} name="folder-outline" size={19} /><Typography numberOfLines={1} variant="emphasis-sm" style={{ flex: 1 }}>{folder.name}</Typography><Button onPress={() => { setEditingFolder(folder); setFolderName(folder.name); }} size="compact" variant="secondary">Rename</Button><Button onPress={() => setDeleteFolderTarget(folder)} size="compact" variant="danger">Delete</Button></View>)}</View></ScrollView></Modal>

    <Modal visible={Boolean(deleteFolderTarget)} onClose={() => !folderBusy && setDeleteFolderTarget(null)} showCloseButton={false} cancelText="Cancel" onCancel={() => setDeleteFolderTarget(null)} confirmText={folderBusy ? 'Deleting…' : 'Delete folder'} confirmVariant="destructive" confirmDisabled={folderBusy} onConfirm={() => void confirmDeleteFolder()}><View style={{ gap: SPACE.md }}><Typography variant="title">Delete “{deleteFolderTarget?.name}”?</Typography><Typography variant="body">Notes in this folder will move to Unfiled. No Notes will be deleted.</Typography></View></Modal>

    <Modal visible={Boolean(moveTarget)} onClose={() => !folderBusy && setMoveTarget(null)} contentStyle={{ maxWidth: 480 }}><View style={{ gap: SPACE.lg }}><Typography variant="title">Move to folder</Typography><FilterChoice label="Unfiled" selected={moveTarget?.folderId === null} onPress={() => void moveNote(null)} />{folders.map((folder) => <FilterChoice key={folder.id} label={folder.name} selected={moveTarget?.folderId === folder.id} onPress={() => void moveNote(folder.id)} />)}{folderError ? <Typography accessibilityRole="alert" variant="caption" style={{ color: colors.feedback.danger.text }}>{folderError}</Typography> : null}</View></Modal>

    <Modal visible={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} showCloseButton={false} cancelText="Cancel" onCancel={() => setDeleteTarget(null)} confirmText="Delete Note" confirmVariant="destructive" onConfirm={() => void confirmDeleteNote()}><View style={{ gap: SPACE.md }}><Typography variant="title">Delete “{deleteTarget?.title || 'Untitled note'}”?</Typography><Typography variant="body">This permanently deletes the Note. Its folder assignment will also be removed.</Typography></View></Modal>
  </ScrollView>;
}
