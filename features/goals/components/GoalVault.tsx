import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';
import { useWorkspaceDimensions } from '@/components/layout/WorkspaceContext';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Typography } from '@/components/ui/Typography';
import { VaultIcon } from '@/components/ui/VaultIcon';
import { Modal } from '@/components/ui/Modal';
import { RADIUS, SPACE } from '@/constants/design';
import { useThemeColors } from '@/store/uiStore';
import type { EntryRecord } from '@/features/entries/types';
import type { ActivityItem } from '@/types/activity';
import type { GoalWithDetails } from '../types';
import type { VaultItem } from '@/types/vault';
import { useVault } from '../hooks/useVault';
import { readContextVaultEntries } from '@/features/entries/services/context-vault';
import supabase from '@/lib/db/client';
import { VaultItemCard } from './VaultItemCard';
import { isSourceVaultItem } from '../vault-classification';
import { SourceComposer } from '@/features/sources/components/SourceComposer';
import { useAuthStore } from '@/features/auth/store';

export type VaultFilter = 'all' | 'notes' | 'reflections' | 'sources';

export interface VaultWorkspaceParent {
  id: string;
  title: string;
  type: 'goal' | 'project';
}

export interface VaultDataSource {
  items: VaultItem[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  updateItem: (itemId: string, updates: Partial<VaultItem>) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
}

interface VaultWorkspaceProps {
  activityError: string | null;
  activityItems: readonly ActivityItem[];
  activityLoading: boolean;
  entries: readonly EntryRecord[];
  entriesError: string | null;
  entriesLoading?: boolean;
  onRetryEntries?: () => void;
  parent: VaultWorkspaceParent;
  activityContent?: ReactNode;
  onAddSource?: () => void;
  vaultData: VaultDataSource;
  externalAddRequest?: number;
  showAddButton?: boolean;
  initialFilter?: VaultFilter;
  refreshSourcesOnMount?: boolean;
}

const FILTERS: ReadonlyArray<{ label: string; value: VaultFilter }> = [
  { label: 'All', value: 'all' },
  { label: 'Notes', value: 'notes' },
  { label: 'Reflections', value: 'reflections' },
  { label: 'Sources', value: 'sources' },
];

function VaultSection({ children, icon, title }: { children: ReactNode; icon: keyof typeof Ionicons.glyphMap; title: string }) {
  const colors = useThemeColors();
  return (
    <View style={{ backgroundColor: colors.background.card, borderColor: colors.border.warmSubtle, borderRadius: RADIUS.xl, borderWidth: 1, padding: SPACE.xl, gap: SPACE.lg }}>
      <View style={{ alignItems: 'center', flexDirection: 'row', gap: SPACE.md }}>
        <Ionicons color={colors.text.accent} name={icon} size={20} />
        <Typography variant="title">{title}</Typography>
      </View>
      {children}
    </View>
  );
}

/** Parent-neutral Vault presentation. Goal-specific data is supplied by GoalVault. */
export function VaultWorkspace({ activityContent, activityError, activityItems, activityLoading, entries, entriesError, entriesLoading = false, onRetryEntries, externalAddRequest, initialFilter = 'all', onAddSource, parent, showAddButton = true, refreshSourcesOnMount = true, vaultData }: VaultWorkspaceProps) {
  const colors = useThemeColors();
  const viewerId = useAuthStore((state) => state.session?.user.id ?? null);
  const { width } = useWorkspaceDimensions();
  const compact = width < 620;
  const vault = vaultData;
  const [filter, setFilter] = useState<VaultFilter>(initialFilter);
  const [addOpen, setAddOpen] = useState(false);
  const [retriedEntries, setRetriedEntries] = useState<EntryRecord[] | null>(null);
  const [retrying, setRetrying] = useState(false);
  const [entryLoadError, setEntryLoadError] = useState(entriesError);
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);
  const [sourceType, setSourceType] = useState<'all' | 'document' | 'image' | 'link'>('all');
  const request = useRef(0);
  const selectedSource = vault.items.find((item) => item.id === selectedSourceId);

  useEffect(() => setEntryLoadError(entriesError), [entriesError]);
  useEffect(() => { request.current++; setRetriedEntries(null); setRetrying(false); return () => { request.current++; }; }, [entries, parent.id]);
  useEffect(() => setFilter(initialFilter), [initialFilter]);
  useEffect(() => { if (refreshSourcesOnMount) void vault.refresh(); }, [vault.refresh, refreshSourcesOnMount]);
  useEffect(() => { if (externalAddRequest) setAddOpen(true); }, [externalAddRequest]);

  const linkedEntries = retriedEntries ?? entries;
  const notes = linkedEntries.filter((entry) => entry.entryType === 'note');
  const reflections = linkedEntries.filter((entry) => entry.entryType === 'reflection');
  const sources = vault.items.filter(isSourceVaultItem).filter((item) => sourceType === 'all' || item.itemType === sourceType);
  const recentActivity = useMemo(() => [...activityItems]
    .filter((item) => (item.kind === 'vault_item_added' && item.contentKind !== 'sticky_note') || item.kind === 'echo_linked')
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()), [activityItems]);

  async function retrySources() {
    if (onRetryEntries) { onRetryEntries(); if (parent.type === 'goal') await vault.refresh(); return; }
    const generation = ++request.current;
    setRetrying(true);
    await Promise.all([vault.refresh(), readContextVaultEntries(supabase, parent).then((result) => {
      if (generation !== request.current) return;
      setRetriedEntries(result.entries);
      setEntryLoadError(result.incomplete ? 'Some linked Notes and Reflections could not be loaded.' : null);
    }).catch(() => { if (generation === request.current) setEntryLoadError('Linked Notes and Reflections could not be loaded.'); })]);
    if (generation === request.current) setRetrying(false);
  }

  function createEchoEntry(entryType: 'note' | 'reflection') {
    setAddOpen(false);
    router.push({ pathname: entryType === 'note' ? '/(app)/notes' : '/(app)/journal', params: { create: entryType === 'note' ? 'note' : 'new', ...(parent.type === 'goal' ? { goalId: parent.id } : { projectId: parent.id }) } } as never);
  }

  const dateLabel = (value: string | Date) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const activityLabel = (item: ActivityItem) => {
    if (item.kind === 'echo_linked') return 'Note or Reflection linked';
    if (item.kind !== 'vault_item_added') return 'Vault activity';
    if (item.itemType === 'link' || item.itemType === 'document' || item.itemType === 'image') return `Source added — ${item.title}`;
    return `Vault item added — ${item.title}`;
  };
  const sourceOrigin = (item: VaultItem) => {
    const url = item.metadata?.url;
    if (!url) return item.itemType === 'image' ? 'Image' : (item.metadata?.fileType?.toUpperCase() || 'File');
    try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return 'Goal Vault'; }
  };
  const provenance = (item: VaultItem) => {
    const origins = (item as VaultItem & { origins?: Array<{ goalTitle: string }> }).origins ?? [];
    return origins.length ? `From Goal: ${origins.map((origin) => origin.goalTitle).join(', ')}` : 'Added to this Project';
  };
  const entryProvenance = (entry: EntryRecord) => {
    if (parent.type === 'goal') return `From ${parent.title}`;
    const goalTitles = entry.goals.filter((goal) => goal.projectId === parent.id).map((goal) => goal.title);
    return [entry.project?.id === parent.id ? 'Added to this Project' : '', goalTitles.length ? `From Goal: ${goalTitles.slice(0, 2).join(', ')}${goalTitles.length > 2 ? ` +${goalTitles.length - 2}` : ''}` : ''].filter(Boolean).join(' · ');
  };
  const showNotes = filter === 'all' || filter === 'notes';
  const showReflections = filter === 'all' || filter === 'reflections';
  const showSources = filter === 'all' || filter === 'sources';

  const entryCards = (items: readonly EntryRecord[]) => <View style={{ flexDirection: compact ? 'column' : 'row', flexWrap: 'wrap', gap: SPACE.md }}>
    {items.map((entry) => <Pressable key={entry.id} accessibilityLabel={`Open ${entry.title || 'Untitled entry'}`} accessibilityRole="button" onPress={() => router.push({ pathname: entry.entryType === 'note' ? '/(app)/notes/[id]' : '/(app)/journal/[id]', params: { id: entry.id, ...(parent.type === 'goal' ? { goalId: parent.id } : { projectId: parent.id }) } } as never)} style={({ pressed }) => ({ backgroundColor: colors.background.subtle, borderColor: colors.border.divider, borderRadius: RADIUS.lg, borderWidth: 1, flexBasis: compact ? undefined : 280, flexGrow: 1, gap: SPACE.sm, minWidth: compact ? 0 : 250, opacity: pressed ? 0.7 : 1, padding: SPACE.lg })}>
      <Typography variant="caption">{entry.entryType === 'reflection' ? 'Reflection' : 'Note'}</Typography><Typography variant="emphasis-sm">{entry.title || 'Untitled entry'}</Typography><Typography variant="caption">{dateLabel(entry.entryType === 'reflection' ? entry.createdAt : entry.updatedAt)} · {entryProvenance(entry)}</Typography>
    </Pressable>)}
  </View>;

  return (
    <View style={{ gap: SPACE.xl }} testID="goal-vault-workspace">
      <View style={{ backgroundColor: colors.background.card, borderColor: colors.border.warmSubtle, borderRadius: RADIUS.xl, borderWidth: 1, padding: compact ? SPACE.xl : SPACE['3xl'], gap: SPACE.xl }}>
        <View style={{ alignItems: compact ? 'stretch' : 'center', flexDirection: compact ? 'column' : 'row', gap: SPACE.xl, justifyContent: 'space-between' }}>
          <View style={{ gap: SPACE.xs }}>
            <View style={{ alignItems: 'center', flexDirection: 'row', gap: SPACE.md }}>
              <VaultIcon color={colors.text.accent} size={23} />
              <Typography accessibilityRole="header" variant="heading">Vault</Typography>
            </View>
            <Typography variant="body">Everything worth remembering about this {parent.type === 'goal' ? 'Goal' : 'Project'}.</Typography>
            <Typography variant="caption">{parent.type === 'project' ? 'From this Project and its Goals. ' : ''}Only content you can access. Linking does not change sharing.</Typography>
          </View>
          {showAddButton ? <Pressable accessibilityLabel="Add to Vault" accessibilityRole="button" onPress={() => setAddOpen(true)} style={({ pressed }) => ({ alignItems: 'center', alignSelf: compact ? 'stretch' : 'center', backgroundColor: colors.accent.primary, borderRadius: RADIUS.md, flexDirection: 'row', gap: SPACE.sm, justifyContent: 'center', minHeight: 44, opacity: pressed ? 0.75 : 1, paddingHorizontal: SPACE.xl })}>
            <Ionicons color={colors.text.onAccent} name="add" size={18} />
            <Typography variant="emphasis-sm" style={{ color: colors.text.onAccent }}>Add to Vault</Typography>
          </Pressable> : null}
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: SPACE.xs }}>
          {FILTERS.map((option) => {
            const selected = option.value === filter;
            return <Pressable key={option.value} accessibilityRole="button" aria-pressed={selected} accessibilityState={{ selected }} onPress={() => setFilter(option.value)} style={({ pressed }) => ({ backgroundColor: selected ? colors.background.selectedRow : 'transparent', borderBottomColor: selected ? colors.accent.primary : 'transparent', borderBottomWidth: 2, minHeight: 44, justifyContent: 'center', opacity: pressed ? 0.7 : 1, paddingHorizontal: SPACE.lg })}>
              <Typography variant={selected ? 'emphasis-sm' : 'body-small'} style={{ color: selected ? colors.text.accent : colors.text.secondary }}>{option.label}</Typography>
            </Pressable>;
          })}
        </ScrollView>
      </View>

      {(showNotes || showReflections) && entriesLoading ? <View accessibilityLiveRegion="polite" style={{ gap: SPACE.md }}><ActivityIndicator color={colors.text.accent} /><Typography variant="body">Loading linked Notes and Reflections…</Typography></View> : null}
      {entryLoadError && (showNotes || showReflections) ? <View accessibilityRole="alert" style={{ gap: SPACE.md }}><Typography variant="body">{entryLoadError}</Typography><Pressable accessibilityRole="button" disabled={retrying} onPress={() => void retrySources()} style={{ minHeight: 44, justifyContent: 'center' }}><Typography variant="emphasis-sm" style={{ color: colors.text.accent }}>Retry linked content</Typography></Pressable></View> : null}
      {showNotes ? <VaultSection icon="reader-outline" title="Notes">
        {!notes.length && !entryLoadError && !entriesLoading ? <Typography variant="body">Linked Notes will appear here.</Typography> : null}
        {entryCards(notes)}
      </VaultSection> : null}

      {showReflections ? <VaultSection icon="create-outline" title="Reflections">
        {!reflections.length && !entryLoadError && !entriesLoading ? <Typography variant="body">Linked Reflections will appear here.</Typography> : null}
        {entryCards(reflections)}
      </VaultSection> : null}

      {showSources ? <VaultSection icon="link-outline" title="Sources">
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.sm }}>{([
          ['all', 'All'], ['document', 'Files'], ['image', 'Images'], ['link', 'Links'],
        ] as const).map(([value, label]) => <Pressable accessibilityRole="button" aria-pressed={sourceType === value} accessibilityState={{ selected: sourceType === value }} key={value} onPress={() => setSourceType(value)} style={({ pressed }) => ({ backgroundColor: sourceType === value ? colors.background.selectedRow : colors.background.input, borderColor: sourceType === value ? colors.border.accent : colors.border.input, borderRadius: RADIUS.round, borderWidth: 1, minHeight: 44, justifyContent: 'center', opacity: pressed ? 0.7 : 1, paddingHorizontal: SPACE.lg })}><Typography variant="body-small" style={{ color: sourceType === value ? colors.text.accent : colors.text.secondary }}>{label}</Typography></Pressable>)}</View>
        {vault.loading ? <ActivityIndicator color={colors.accent.primary} /> : null}
        {vault.error ? <View style={{ alignItems: 'center', flexDirection: 'row', gap: SPACE.md }}><Typography variant="caption">Sources couldn't load.</Typography><Pressable accessibilityRole="button" onPress={() => void retrySources()}><Typography variant="emphasis-sm" style={{ color: colors.text.accent }}>Retry</Typography></Pressable></View> : null}
        {!vault.loading && !vault.error && !sources.length ? <Typography variant="body">Saved links, documents, and other source material will appear here.</Typography> : null}
        <View style={{ flexDirection: compact ? 'column' : 'row', flexWrap: 'wrap', gap: SPACE.md }}>
          {sources.map((item) => <Pressable key={item.id} accessibilityLabel={`Open ${item.title || 'Untitled material'}`} accessibilityRole="button" onPress={() => setSelectedSourceId(item.id)} style={({ pressed }) => ({ backgroundColor: colors.background.subtle, borderColor: colors.border.divider, borderRadius: RADIUS.lg, borderWidth: 1, flexBasis: compact ? undefined : 280, flexGrow: 1, gap: SPACE.sm, minWidth: compact ? 0 : 250, opacity: pressed ? 0.7 : 1, padding: SPACE.lg })}>
            <Typography variant="caption">{sourceOrigin(item)}</Typography><Typography variant="emphasis-sm">{item.title || item.metadata?.fileName || (item.itemType === 'link' ? 'Saved link' : 'Untitled material')}</Typography><Typography variant="caption">{dateLabel(item.createdAt)} · {parent.type === 'project' ? provenance(item) : `From ${parent.title}`}</Typography>
          </Pressable>)}
        </View>
      </VaultSection> : null}

      {filter === 'all' ? <VaultSection icon="time-outline" title="Recent Vault Activity">
        {activityContent ?? (activityLoading ? <ActivityIndicator color={colors.accent.primary} /> : activityError ? <Typography variant="body">Vault activity could not be loaded.</Typography> : recentActivity.length ? recentActivity.slice(0, 12).map((item) => <View key={item.id} style={{ alignItems: compact ? 'flex-start' : 'center', borderBottomColor: colors.border.divider, borderBottomWidth: 1, flexDirection: compact ? 'column' : 'row', gap: SPACE.sm, justifyContent: 'space-between', paddingVertical: SPACE.md }}><Typography variant="body-small">{activityLabel(item)}</Typography><Typography variant="caption">{dateLabel(item.timestamp)}</Typography></View>) : <Typography variant="body">Meaningful Vault activity will appear here.</Typography>)}
      </VaultSection> : null}

      <Modal visible={addOpen} onClose={() => setAddOpen(false)} contentStyle={{ maxWidth: 520 }}>
        <ScrollView style={{ maxHeight: 520 }} contentContainerStyle={{ gap: SPACE.lg }}><Typography variant="title">Add to Vault</Typography>
          <Typography variant="eyebrow">CREATE NEW</Typography>
          {[
            { key: 'note', icon: 'reader-outline' as const, title: 'Note', detail: 'Create a linked Note.', action: () => createEchoEntry('note') },
            { key: 'reflection', icon: 'create-outline' as const, title: 'Reflection', detail: 'Create a linked Reflection.', action: () => createEchoEntry('reflection') },
            { key: 'source', icon: 'link-outline' as const, title: 'Source', detail: 'Add a file, image, or link.', action: () => { setAddOpen(false); if (onAddSource) onAddSource(); else router.push(`/(app)/goals/${parent.id}/vault` as never); } },
          ].map((option) => <Pressable key={option.key} accessibilityRole="button" accessibilityLabel={`Add ${option.title}`} onPress={option.action} style={({ pressed }) => ({ alignItems: 'center', backgroundColor: pressed ? colors.background.selectedRow : colors.background.subtle, borderRadius: RADIUS.md, flexDirection: 'row', gap: SPACE.lg, minHeight: 64, padding: SPACE.lg })}><Ionicons color={colors.text.accent} name={option.icon} size={22} /><View style={{ flex: 1 }}><Typography variant="emphasis-sm">{option.title}</Typography><Typography variant="caption">{option.detail}</Typography></View><Ionicons color={colors.text.muted} name="chevron-forward" size={17} /></Pressable>)}
          <Typography variant="eyebrow">LINK EXISTING</Typography>
          <Typography variant="body-small">Open a Note or Reflection in your library, then use its link controls to select {parent.title}. Sharing is a separate choice; linking does not grant access.</Typography>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.md }}>{(['note', 'reflection'] as const).map((kind) => <Pressable key={kind} accessibilityRole="button" onPress={() => { setAddOpen(false); router.push(kind === 'note' ? '/(app)/notes' : '/(app)/journal'); }} style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: SPACE.md }}><Typography variant="emphasis-sm" style={{ color: colors.text.accent }}>{kind === 'note' ? 'Browse Notes' : 'Browse Reflections'}</Typography></Pressable>)}</View>
        </ScrollView>
      </Modal>
      <Modal accessibilityLabel="Source details" visible={Boolean(selectedSource)} onClose={() => setSelectedSourceId(null)} contentStyle={{ maxWidth: 620, maxHeight: '90%' }}><ScrollView style={{ flexShrink: 1 }}>{selectedSource ? <VaultItemCard canManageSource={viewerId === selectedSource.createdBy} item={selectedSource} goalId={parent.id} onUpdate={vault.updateItem} onDelete={vault.removeItem} /> : null}</ScrollView></Modal>
    </View>
  );
}

export function GoalVault(props: Omit<VaultWorkspaceProps, 'parent' | 'vaultData' | 'onAddSource'> & { goal: GoalWithDetails }) {
  const { goal, ...workspaceProps } = props;
  const vault = useVault(goal.id);
  const [sourceOpen, setSourceOpen] = useState(false);
  return <>
    <VaultWorkspace {...workspaceProps} vaultData={vault} onAddSource={() => setSourceOpen(true)} parent={{ id: goal.id, title: goal.title, type: 'goal' }} />
    <SourceComposer
      canShare={Boolean(goal.projectId)}
      context={{ kind: 'goal', id: goal.id }}
      onClose={() => setSourceOpen(false)}
      onCreated={() => { void vault.refresh(); }}
      visible={sourceOpen}
    />
  </>;
}
