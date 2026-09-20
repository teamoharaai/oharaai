import { useEffect, useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { Typography } from '@/components/ui/Typography';
import { Modal } from '@/components/ui/Modal';
import { SPACE } from '@/constants/design';
import { useThemeColors } from '@/store/uiStore';
import type { EntryRecord } from '@/features/entries/types';
import type { ActivityItem } from '@/types/activity';
import type { GoalWithDetails } from '../types';
import { useVault } from '../hooks/useVault';
import { GoalSectionHeading } from '@/components/ui/GoalSectionHeading';
import { fetchEntries } from '@/features/entries/services/entry-service';
import { VaultItemCard } from './VaultItemCard';

/** Goal memory presentation; uses existing owner-scoped sources and activity. */
export function GoalVault({ goal, entries, entriesError, activityItems, activityLoading, activityError, privateNotes }: {
  privateNotes: ReactNode;
  goal: GoalWithDetails;
  entries: readonly EntryRecord[];
  entriesError: string | null;
  activityItems: readonly ActivityItem[];
  activityLoading: boolean;
  activityError: string | null;
}) {
  const colors = useThemeColors();
  const { width } = useWindowDimensions();
  const vault = useVault(goal.id);
  const [showAll, setShowAll] = useState(false);
  const [showCompletions, setShowCompletions] = useState(false);
  const [retriedEntries, setRetriedEntries] = useState<EntryRecord[] | null>(null);
  const [retrying, setRetrying] = useState(false);
  const [entryLoadError, setEntryLoadError] = useState(entriesError);
  useEffect(() => setEntryLoadError(entriesError), [entriesError]);
  async function retrySources() {
    setRetrying(true);
    await Promise.all([vault.refresh(), fetchEntries().then((result) => {
      setRetriedEntries(result.filter((entry) => entry.goals.some((linked) => linked.id === goal.id)));
      setEntryLoadError(null);
    }).catch(() => setEntryLoadError('Linked entries could not be loaded.'))]);
    setRetrying(false);
  }
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);
  const selectedSource = vault.items.find((item) => item.id === selectedSourceId);
  useEffect(() => { void vault.refresh(); }, [vault.refresh]);
  const openStorage = () => router.push(`/(app)/goals/${goal.id}/vault` as never);
  const sources = [
    ...(retriedEntries ?? entries).map((entry) => ({
      id: `entry-${entry.id}`, type: entry.entryType, title: entry.title || 'Untitled entry',
      date: entry.updatedAt, origin: 'Echo',
      open: () => router.push({ pathname: '/(app)/entries/[id]' as never, params: { id: entry.id } }),
    })),
    ...vault.items.map((item) => ({
      id: `vault-${item.id}`, type: item.itemType, title: item.title || (item.itemType === 'link' ? 'Saved link' : 'Untitled material'),
      date: item.createdAt, origin: 'Goal Vault', open: () => setSelectedSourceId(item.id),
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const timeline = [...activityItems]
    .filter((item) => item.kind !== 'tracker_logged')
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  const completions = timeline.filter((item) => item.kind === 'task_completed' || item.kind === 'milestone_completed')
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  function eventTitle(item: ActivityItem) {
    switch (item.kind) {
      case 'goal_created': return 'Goal created';
      case 'milestone_completed': return `Reached ${item.label}`;
      case 'task_completed': return `Completed ${item.label}`;
      case 'tracker_logged': return `Logged ${item.label}`;
      case 'vault_item_added': return `Added ${item.title}`;
      case 'insight_confirmed': return 'Insight confirmed';
      case 'echo_linked': return 'Reflection linked';
      case 'echo_entry': return 'Reflection recorded';
    }
  }
  const dateLabel = (date: string | Date) => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  return (
    <View style={{ padding: width < 700 ? SPACE.xl : SPACE['3xl'], gap: SPACE['4xl'] }}>
      <View style={{ gap: SPACE.md }}>
        <Typography variant="heading">Vault</Typography>
        <Typography variant="body">The material and moments behind this Goal.</Typography>
      </View>
      <View testID="goal-private-notes" style={{ gap: SPACE.lg }}>
        <GoalSectionHeading>Private Notes</GoalSectionHeading>
        <Typography variant="caption">Only you can see these notes. They are not shared through Circles, public Goals, or Projects.</Typography>
        {privateNotes}
      </View>
      <View style={{ gap: SPACE.lg }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: SPACE.md }}>
          <GoalSectionHeading>Linked Notes & Reflections</GoalSectionHeading>
          <Pressable accessibilityRole="button" onPress={openStorage} style={{ minHeight: 44, justifyContent: 'center' }}>
            <Typography variant="emphasis-sm" style={{ color: colors.text.accent }}>Manage material →</Typography>
          </Pressable>
        </View>
        {vault.loading ? <ActivityIndicator color={colors.accent.primary} /> : null}
        {vault.error || entryLoadError ? <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: SPACE.md }}>
          <Typography variant="caption">Some linked material couldn't load.</Typography>
          <Pressable accessibilityRole="button" disabled={retrying} onPress={() => void retrySources()} style={{ minHeight: 44, justifyContent: 'center' }}>
            <Typography variant="emphasis-sm" style={{ color: colors.text.accent }}>{retrying ? 'Retrying…' : 'Retry'}</Typography>
          </Pressable>
        </View> : null}
        {!vault.loading && !sources.length ? <Typography variant="body">Linked Notes, Reflections, and saved material will appear here.</Typography> : null}
        {sources.map((source) => (
          <Pressable key={source.id} accessibilityRole="button" accessibilityLabel={`Open ${source.title}`}
            onPress={source.open} style={{ borderBottomWidth: 1, borderBottomColor: colors.border.divider, paddingVertical: SPACE.lg, gap: SPACE.sm }}>
            <Typography variant="caption">{source.type.replace('_', ' ')} · {source.origin}</Typography>
            <Typography variant="emphasis-sm">{source.title}</Typography>
            <Typography variant="caption">{dateLabel(source.date)}</Typography>
          </Pressable>
        ))}
      </View>
      <View testID="goal-recent-activity" style={{ gap: SPACE.lg }}>
        <GoalSectionHeading>Recent Activity</GoalSectionHeading>
        {activityLoading ? <ActivityIndicator color={colors.accent.primary} /> : activityError ?
          <Typography variant="body">Timeline could not be loaded right now.</Typography> :
          (showAll ? timeline : timeline.slice(0, 5)).map((item) => (
            <View key={item.id} style={{ borderLeftWidth: 2, borderLeftColor: colors.border.accent, paddingLeft: SPACE.lg, paddingVertical: SPACE.md, gap: SPACE.sm }}>
              <Typography variant="emphasis-sm">{eventTitle(item)}</Typography>
              <Typography variant="caption">{dateLabel(item.timestamp)}</Typography>
            </View>
          ))}
        {!activityLoading && !activityError && !timeline.length ? <Typography variant="body">Meaningful Goal history will appear here.</Typography> : null}
        {timeline.length > 5 ? <Pressable accessibilityRole="button" onPress={() => setShowAll((value) => !value)} style={{ minHeight: 44 }}>
          <Typography variant="emphasis-sm" style={{ color: colors.text.accent }}>{showAll ? 'Show less ↑' : 'View all activity →'}</Typography>
        </Pressable> : null}
      </View>
      <View testID="goal-completion-timeline" style={{ gap: SPACE.lg }}>
        <GoalSectionHeading>Completion Timeline</GoalSectionHeading>
        <Typography variant="body">Meaningful work completed toward this Goal.</Typography>
        {activityLoading ? <ActivityIndicator color={colors.accent.primary} /> : activityError ?
          <Typography variant="body">Completions could not be loaded right now.</Typography> :
          (showCompletions ? completions : completions.slice(-10)).map((item) => (
            <View key={item.id} style={{ borderLeftWidth: 2, borderLeftColor: colors.border.accent, paddingLeft: SPACE.lg, paddingVertical: SPACE.md, gap: SPACE.sm }}>
              <Typography variant="emphasis-sm">{eventTitle(item)}</Typography>
              <Typography variant="caption">{dateLabel(item.timestamp)}</Typography>
            </View>
          ))}
        {!activityLoading && !activityError && !completions.length ? <Typography variant="body">Completed Tasks and Milestones will appear here.</Typography> : null}
        {completions.length > 10 ? <Pressable accessibilityRole="button" onPress={() => setShowCompletions((value) => !value)} style={{ minHeight: 44 }}>
          <Typography variant="emphasis-sm" style={{ color: colors.text.accent }}>{showCompletions ? 'Show recent completions ↑' : 'View all completions →'}</Typography>
        </Pressable> : null}
      </View>
      <Modal visible={Boolean(selectedSource)} onClose={() => setSelectedSourceId(null)}
        contentStyle={{ maxWidth: 620, maxHeight: '90%' }}>
        <ScrollView style={{ flexShrink: 1 }}>
          {selectedSource ? <VaultItemCard item={selectedSource} goalId={goal.id}
            onUpdate={vault.updateItem} onDelete={vault.removeItem} /> : null}
        </ScrollView>
      </Modal>
    </View>
  );
}
