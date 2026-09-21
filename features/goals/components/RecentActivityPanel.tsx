import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { Typography } from '@/components/ui/Typography';
import { GoalSectionHeading } from '@/components/ui/GoalSectionHeading';
import { SPACE } from '@/constants/design';
import { useThemeColors } from '@/store/uiStore';
import type { ActivityItem } from '@/types/activity';

// Recent Activity moved out of the Vault tab into the goal side rail, directly
// under Momentum. Format preserved from GoalVault: an accent-left-bordered list
// of meaningful goal events. Only an optimized slice renders by default; the
// remainder collapses behind a "Load more · View history" toggle.
const DEFAULT_VISIBLE = 5;

function eventTitle(item: ActivityItem): string {
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

const dateLabel = (date: string | Date) =>
  new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

export function RecentActivityPanel({
  items,
  loading = false,
  error = null,
}: {
  items: readonly ActivityItem[];
  loading?: boolean;
  error?: string | null;
}) {
  const colors = useThemeColors();
  const [showAll, setShowAll] = useState(false);
  const timeline = useMemo(
    () => [...items]
      .filter((item) => item.kind !== 'tracker_logged')
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
    [items],
  );
  const visible = showAll ? timeline : timeline.slice(0, DEFAULT_VISIBLE);

  return (
    <View testID="goal-recent-activity" style={{ padding: SPACE.xl, gap: SPACE.lg }}>
      <GoalSectionHeading>Recent Activity</GoalSectionHeading>
      {loading ? (
        <ActivityIndicator color={colors.accent.primary} />
      ) : error ? (
        <Typography variant="body">Timeline could not be loaded right now.</Typography>
      ) : (
        visible.map((item) => (
          <View
            key={item.id}
            style={{ borderLeftWidth: 2, borderLeftColor: colors.border.accent, paddingLeft: SPACE.lg, paddingVertical: SPACE.md, gap: SPACE.sm }}
          >
            <Typography variant="emphasis-sm">{eventTitle(item)}</Typography>
            <Typography variant="caption">{dateLabel(item.timestamp)}</Typography>
          </View>
        ))
      )}
      {!loading && !error && !timeline.length ? (
        <Typography variant="body">Meaningful Goal history will appear here.</Typography>
      ) : null}
      {timeline.length > DEFAULT_VISIBLE ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => setShowAll((value) => !value)}
          style={{ minHeight: 44, justifyContent: 'center' }}
        >
          <Typography variant="emphasis-sm" style={{ color: colors.text.accent }}>
            {showAll ? 'Show less ↑' : 'Load more · View history →'}
          </Typography>
        </Pressable>
      ) : null}
    </View>
  );
}
