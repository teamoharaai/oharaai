import { View } from 'react-native';
import { Typography } from '@/components/ui/Typography';
import { RADIUS, SPACE } from '@/constants/design';
import { useThemeColors } from '@/store/uiStore';
import type { ActivityDayBucket, GoalActivityKind } from '@/lib/activity/goal-activity';

// Pure render of the L1 goal-activity window (design/001 Part B). Receives the
// bucketed ActivityDayBucket[] as props — no DB access here (features/CLAUDE.md
// rule 3). Buckets arrive oldest→newest with today last; this component never
// re-sorts them. Phase C renders the day's `kinds` as a multi-emblem set (one
// colored glyph per distinct kind), hollow when the day has no activity.

const WEEKDAY_INITIALS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'] as const; // isoWeekday 1..7
const WEEKDAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;

const KIND_LABELS: Record<GoalActivityKind, string> = {
  task_completed: 'task completed',
  entry_created: 'entry',
  milestone_completed: 'milestone',
};

/** One distinct emblem color per kind, in GOAL_ACTIVITY_KIND_ORDER. */
function kindColor(kind: GoalActivityKind, colors: ReturnType<typeof useThemeColors>): string {
  switch (kind) {
    case 'task_completed':
      return colors.accent.primary;
    case 'entry_created':
      return colors.accent.tealMid;
    case 'milestone_completed':
      return colors.brt.rose;
  }
}

function accessibilityLabel(bucket: ActivityDayBucket): string {
  const weekday = WEEKDAY_NAMES[bucket.isoWeekday - 1] ?? '';
  const todaySuffix = bucket.isToday ? ', today' : '';
  const activity = bucket.kinds.length
    ? bucket.kinds.map((kind) => KIND_LABELS[kind]).join(', ')
    : 'no activity';
  return `${weekday}, ${bucket.date}${todaySuffix}: ${activity}`;
}

export function GoalActivityRow({
  buckets,
  loading = false,
}: {
  buckets: readonly ActivityDayBucket[];
  loading?: boolean;
}) {
  const colors = useThemeColors();
  // Always show seven slots for a stable layout, even before data lands.
  const cells: Array<ActivityDayBucket | null> = buckets.length
    ? [...buckets]
    : Array.from({ length: 7 }, () => null);

  return (
    <View accessibilityLabel="Last 7 days of goal activity" style={{ flexDirection: 'row', gap: SPACE.md }}>
      {cells.map((bucket, index) => {
        const kinds = !loading && bucket ? bucket.kinds : [];
        const active = kinds.length > 0;
        const isToday = bucket?.isToday ?? false;
        const initial = WEEKDAY_INITIALS[(bucket ? bucket.isoWeekday - 1 : index) % 7];
        return (
          <View
            key={bucket?.date ?? `slot-${index}`}
            accessibilityLabel={bucket ? accessibilityLabel(bucket) : undefined}
            style={{ alignItems: 'center', flex: 1, gap: SPACE.xs }}
          >
            <View
              style={{
                alignItems: 'center',
                backgroundColor: 'transparent',
                // Today always keeps its ring so it stays distinguishable even
                // when it has activity; other active days drop the outline.
                borderColor: isToday
                  ? colors.border.accent
                  : active
                    ? 'transparent'
                    : colors.border.input,
                borderRadius: RADIUS.round,
                borderWidth: isToday ? 2 : 1.5,
                flexDirection: 'row',
                gap: 2,
                height: 22,
                justifyContent: 'center',
                minWidth: 22,
                paddingHorizontal: active ? 4 : 0,
              }}
            >
              {active
                ? kinds.map((kind) => (
                    <View
                      key={kind}
                      style={{
                        backgroundColor: kindColor(kind, colors),
                        borderRadius: RADIUS.round,
                        height: 8,
                        width: 8,
                      }}
                    />
                  ))
                : null}
            </View>
            <Typography
              variant="caption"
              style={{ color: isToday ? colors.text.accent : colors.text.muted }}
            >
              {initial}
            </Typography>
          </View>
        );
      })}
    </View>
  );
}
