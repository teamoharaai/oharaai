import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
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
import { fetchEntries } from '@/features/entries/services/entry-service';
import { VaultItemCard } from './VaultItemCard';
import { isStickyVaultItem } from '../vault-classification';

type VaultFilter = 'all' | 'sticky' | 'notes' | 'reflections' | 'sources';

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
  onAddStickyNote: () => void;
  parent: VaultWorkspaceParent;
  privateNotes: ReactNode;
  activityContent?: ReactNode;
  onAddSource?: () => void;
  vaultData?: VaultDataSource;
  externalAddRequest?: number;
  showAddButton?: boolean;
}

const FILTERS: ReadonlyArray<{ label: string; value: VaultFilter }> = [
  { label: 'All', value: 'all' },
  { label: 'Sticky Notes', value: 'sticky' },
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
export function VaultWorkspace({ activityContent, activityError, activityItems, activityLoading, entries, entriesError, externalAddRequest, onAddSource, onAddStickyNote, parent, privateNotes, showAddButton = true, vaultData }: VaultWorkspaceProps) {
  const colors = useThemeColors();
  const { width } = useWindowDimensions();
  const compact = width < 620;
  const goalVault = useVault(parent.type === 'goal' ? parent.id : '');
  const vault = vaultData ?? goalVault;
  const [filter, setFilter] = useState<VaultFilter>('all');
  const [addOpen, setAddOpen] = useState(false);
  const [retriedEntries, setRetriedEntries] = useState<EntryRecord[] | null>(null);
  const [retrying, setRetrying] = useState(false);
  const [entryLoadError, setEntryLoadError] = useState(entriesError);
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);
  const selectedSource = vault.items.find((item) => item.id === selectedSourceId);

  useEffect(() => setEntryLoadError(entriesError), [entriesError]);
  useEffect(() => { void vault.refresh(); }, [vault.refresh]);
  useEffect(() => { if (externalAddRequest) setAddOpen(true); }, [externalAddRequest]);

  const linkedEntries = retriedEntries ?? entries;
  const notes = linkedEntries.filter((entry) => entry.entryType === 'note');
  const reflections = linkedEntries.filter((entry) => entry.entryType === 'reflection');
  const sources = vault.items.filter((item) => !isStickyVaultItem(item));
  const recentActivity = useMemo(() => [...activityItems]
    .filter((item) => item.kind === 'vault_item_added' || item.kind === 'echo_linked')
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()), [activityItems]);

  async function retrySources() {
    setRetrying(true);
    await Promise.all([
      vault.refresh(),
      fetchEntries().then((result) => {
        setRetriedEntries(result.filter((entry) => parent.type === 'goal'
          ? entry.goals.some((linked) => linked.id === parent.id)
          : entry.project?.id === parent.id));
        setEntryLoadError(null);
      }).catch(() => setEntryLoadError('Linked entries could not be loaded.')),
    ]);
    setRetrying(false);
  }

  function createEchoEntry(entryType: 'note' | 'reflection') {
    setAddOpen(false);
    router.push({ pathname: '/(app)/entries', params: { create: entryType, view: entryType, ...(parent.type === 'goal' ? { goalId: parent.id } : { projectId: parent.id }) } } as never);
  }

  function addStickyNote() {
    setAddOpen(false);
    setFilter('sticky');
    onAddStickyNote();
  }

  const dateLabel = (value: string | Date) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const activityLabel = (item: ActivityItem) => {
    if (item.kind === 'echo_linked') return 'Echo entry linked';
    if (item.kind !== 'vault_item_added') return 'Vault activity';
    if (item.contentKind === 'sticky_note') return `Sticky Note created — ${item.title}`;
    if (item.itemType === 'link' || item.itemType === 'document') return `Source added — ${item.title}`;
    return `Vault item added — ${item.title}`;
  };
  const sourceOrigin = (url: string | undefined) => {
    if (!url) return 'Goal Vault';
    try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return 'Goal Vault'; }
  };
  const provenance = (item: VaultItem) => {
    const origins = (item as VaultItem & { origins?: Array<{ goalTitle: string }> }).origins ?? [];
    return origins.length ? `From: ${origins.map((origin) => origin.goalTitle).join(', ')}` : 'Project note';
  };
  const entryProvenance = (entry: EntryRecord) => {
    if (parent.type === 'goal') return `From ${parent.title}`;
    if (entry.project?.id === parent.id) return 'Project note';
    const goalTitles = entry.goals.filter((goal) => goal.projectId === parent.id).map((goal) => goal.title);
    return goalTitles.length ? `From: ${goalTitles.join(', ')}` : 'Project note';
  };
  const showSticky = filter === 'all' || filter === 'sticky';
  const showNotes = filter === 'all' || filter === 'notes';
  const showReflections = filter === 'all' || filter === 'reflections';
  const showSources = filter === 'all' || filter === 'sources';
  const visibleEntries = [...(showNotes ? notes : []), ...(showReflections ? reflections : [])];

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
          </View>
          {showAddButton ? <Pressable accessibilityLabel="Add to Vault" accessibilityRole="button" onPress={() => setAddOpen(true)} style={({ pressed }) => ({ alignItems: 'center', alignSelf: compact ? 'stretch' : 'center', backgroundColor: colors.accent.primary, borderRadius: RADIUS.md, flexDirection: 'row', gap: SPACE.sm, justifyContent: 'center', minHeight: 44, opacity: pressed ? 0.75 : 1, paddingHorizontal: SPACE.xl })}>
            <Ionicons color={colors.text.onAccent} name="add" size={18} />
            <Typography variant="emphasis-sm" style={{ color: colors.text.onAccent }}>Add to Vault</Typography>
          </Pressable> : null}
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: SPACE.xs }}>
          {FILTERS.map((option) => {
            const selected = option.value === filter;
            return <Pressable key={option.value} accessibilityRole="tab" accessibilityState={{ selected }} onPress={() => setFilter(option.value)} style={({ pressed }) => ({ backgroundColor: selected ? colors.background.selectedRow : 'transparent', borderBottomColor: selected ? colors.accent.primary : 'transparent', borderBottomWidth: 2, minHeight: 42, justifyContent: 'center', opacity: pressed ? 0.7 : 1, paddingHorizontal: SPACE.lg })}>
              <Typography variant={selected ? 'emphasis-sm' : 'body-small'} style={{ color: selected ? colors.text.accent : colors.text.secondary }}>{option.label}</Typography>
            </Pressable>;
          })}
        </ScrollView>
      </View>

      {showSticky ? <VaultSection icon="document-text-outline" title="Sticky Notes">
        <Typography variant="caption">{parent.type === 'goal' ? 'Private to you. Sticky Notes appear in Projects only through owner-authorized aggregation.' : 'Private to you. Project Vault content is owner-only.'}</Typography>
        <View testID="goal-private-notes">{privateNotes}</View>
      </VaultSection> : null}

      {(showNotes || showReflections) ? <VaultSection icon="reader-outline" title={filter === 'notes' ? 'Notes' : filter === 'reflections' ? 'Reflections' : 'Notes & Reflections'}>
        {entryLoadError ? <View style={{ alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.md }}><Typography variant="caption">Linked entries couldn't load.</Typography><Pressable accessibilityRole="button" disabled={retrying} onPress={() => void retrySources()} style={{ minHeight: 44, justifyContent: 'center' }}><Typography variant="emphasis-sm" style={{ color: colors.text.accent }}>{retrying ? 'Retrying…' : 'Retry'}</Typography></Pressable></View> : null}
        {visibleEntries.length === 0 && !entryLoadError ? <Typography variant="body">Linked {filter === 'all' ? 'Notes and Reflections' : FILTERS.find((item) => item.value === filter)?.label} will appear here.</Typography> : null}
        <View style={{ flexDirection: compact ? 'column' : 'row', flexWrap: 'wrap', gap: SPACE.md }}>
          {visibleEntries.map((entry) => <Pressable key={entry.id} accessibilityLabel={`Open ${entry.title || 'Untitled entry'}`} accessibilityRole="button" onPress={() => router.push({ pathname: '/(app)/entries/[id]' as never, params: { id: entry.id } })} style={({ pressed }) => ({ backgroundColor: colors.background.subtle, borderColor: colors.border.divider, borderRadius: RADIUS.lg, borderWidth: 1, flexBasis: compact ? undefined : 280, flexGrow: 1, gap: SPACE.sm, minWidth: compact ? 0 : 250, opacity: pressed ? 0.7 : 1, padding: SPACE.lg })}>
            <Typography variant="caption">{entry.entryType === 'reflection' ? 'Reflection' : 'Note'} · Echo</Typography><Typography variant="emphasis-sm">{entry.title || 'Untitled entry'}</Typography><Typography variant="caption">{dateLabel(entry.updatedAt)} · {entryProvenance(entry)}</Typography>
          </Pressable>)}
        </View>
      </VaultSection> : null}

      {showSources ? <VaultSection icon="link-outline" title="Sources">
        {vault.loading ? <ActivityIndicator color={colors.accent.primary} /> : null}
        {vault.error ? <View style={{ alignItems: 'center', flexDirection: 'row', gap: SPACE.md }}><Typography variant="caption">Sources couldn't load.</Typography><Pressable accessibilityRole="button" onPress={() => void retrySources()}><Typography variant="emphasis-sm" style={{ color: colors.text.accent }}>Retry</Typography></Pressable></View> : null}
        {!vault.loading && !sources.length ? <Typography variant="body">Saved links, documents, and other source material will appear here.</Typography> : null}
        <View style={{ flexDirection: compact ? 'column' : 'row', flexWrap: 'wrap', gap: SPACE.md }}>
          {sources.map((item) => <Pressable key={item.id} accessibilityLabel={`Open ${item.title || 'Untitled material'}`} accessibilityRole="button" onPress={() => setSelectedSourceId(item.id)} style={({ pressed }) => ({ backgroundColor: colors.background.subtle, borderColor: colors.border.divider, borderRadius: RADIUS.lg, borderWidth: 1, flexBasis: compact ? undefined : 280, flexGrow: 1, gap: SPACE.sm, minWidth: compact ? 0 : 250, opacity: pressed ? 0.7 : 1, padding: SPACE.lg })}>
            <Typography variant="caption">{item.itemType.replace('_', ' ')} · {sourceOrigin(item.metadata?.url)}</Typography><Typography variant="emphasis-sm">{item.title || (item.itemType === 'link' ? 'Saved link' : 'Untitled material')}</Typography><Typography variant="caption">{dateLabel(item.createdAt)} · {parent.type === 'project' ? provenance(item) : `From ${parent.title}`}</Typography>
          </Pressable>)}
        </View>
      </VaultSection> : null}

      {filter === 'all' ? <VaultSection icon="time-outline" title="Recent Vault Activity">
        {activityContent ?? (activityLoading ? <ActivityIndicator color={colors.accent.primary} /> : activityError ? <Typography variant="body">Vault activity could not be loaded.</Typography> : recentActivity.length ? recentActivity.slice(0, 12).map((item) => <View key={item.id} style={{ alignItems: compact ? 'flex-start' : 'center', borderBottomColor: colors.border.divider, borderBottomWidth: 1, flexDirection: compact ? 'column' : 'row', gap: SPACE.sm, justifyContent: 'space-between', paddingVertical: SPACE.md }}><Typography variant="body-small">{activityLabel(item)}</Typography><Typography variant="caption">{dateLabel(item.timestamp)}</Typography></View>) : <Typography variant="body">Meaningful Vault activity will appear here.</Typography>)}
      </VaultSection> : null}

      <Modal visible={addOpen} onClose={() => setAddOpen(false)} contentStyle={{ maxWidth: 520 }}>
        <View style={{ gap: SPACE.lg }}><Typography variant="title">Add to Vault</Typography>
          {[
            { key: 'sticky', icon: 'document-text-outline' as const, title: 'Sticky Note', detail: 'Capture a private note for this Goal.', action: addStickyNote },
            { key: 'note', icon: 'reader-outline' as const, title: 'Note', detail: 'Create a linked Note in Echo.', action: () => createEchoEntry('note') },
            { key: 'reflection', icon: 'create-outline' as const, title: 'Reflection', detail: 'Create a linked Reflection in Echo.', action: () => createEchoEntry('reflection') },
            { key: 'source', icon: 'link-outline' as const, title: 'Source', detail: 'Add a link, document, or other material.', action: () => { setAddOpen(false); if (onAddSource) onAddSource(); else router.push(`/(app)/goals/${parent.id}/vault` as never); } },
          ].map((option) => <Pressable key={option.key} accessibilityRole="button" accessibilityLabel={`Add ${option.title}`} onPress={option.action} style={({ pressed }) => ({ alignItems: 'center', backgroundColor: pressed ? colors.background.selectedRow : colors.background.subtle, borderRadius: RADIUS.md, flexDirection: 'row', gap: SPACE.lg, minHeight: 64, padding: SPACE.lg })}><Ionicons color={colors.text.accent} name={option.icon} size={22} /><View style={{ flex: 1 }}><Typography variant="emphasis-sm">{option.title}</Typography><Typography variant="caption">{option.detail}</Typography></View><Ionicons color={colors.text.muted} name="chevron-forward" size={17} /></Pressable>)}
        </View>
      </Modal>
      <Modal visible={Boolean(selectedSource)} onClose={() => setSelectedSourceId(null)} contentStyle={{ maxWidth: 620, maxHeight: '90%' }}><ScrollView style={{ flexShrink: 1 }}>{selectedSource ? <VaultItemCard item={selectedSource} goalId={parent.id} onUpdate={vault.updateItem} onDelete={vault.removeItem} /> : null}</ScrollView></Modal>
    </View>
  );
}

export function GoalVault(props: Omit<VaultWorkspaceProps, 'parent'> & { goal: GoalWithDetails }) {
  const { goal, ...workspaceProps } = props;
  return <VaultWorkspace {...workspaceProps} parent={{ id: goal.id, title: goal.title, type: 'goal' }} />;
}
