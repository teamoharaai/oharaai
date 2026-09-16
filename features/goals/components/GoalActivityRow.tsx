import { View } from 'react-native';
import { Typography } from '@/components/ui/Typography';
import { RADIUS, SPACE } from '@/constants/design';
import { useThemeColors } from '@/store/uiStore';
import type { ActivityDayBucket, GoalActivityKind } from '@/lib/activity/goal-activity';

// Pure render of the L1 goal-activity window (design/001 Part B). Receives the
// bucketed ActivityDayBucket[] as props — no DB access here (features/CLAUDE.md
// rule 3). Buckets arrive oldest→newest with today last; this component never
// re-sorts them. Phase B renders a single filled/hollow emblem per day; the
// multi-emblem set + heatmap arrive in Phase C (T4) over the same output shape.

const WEEKDAY_INITIALS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'] as const; // isoWeekday 1..7
const WEEKDAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;

const KIND_LABELS: Record<GoalActivityKind, string> = {
  task_completed: 'task completed',
  entry_created: 'entry',
  milestone_completed: 'milestone',
};

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
        const active = !loading && !!bucket && bucket.count > 0;
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
                backgroundColor: active ? colors.accent.primary : 'transparent',
                borderColor: active
                  ? colors.accent.primary
                  : isToday
                    ? colors.border.accent
                    : colors.border.input,
                borderRadius: RADIUS.round,
                borderWidth: isToday ? 2 : 1.5,
                height: 22,
                justifyContent: 'center',
                width: 22,
              }}
            />
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
