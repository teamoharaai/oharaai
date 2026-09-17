import { View } from 'react-native';
import { Typography } from '@/components/ui/Typography';
import { SPACE } from '@/constants/design';
import { useThemeColors } from '@/store/uiStore';
import type { ActivityDayBucket } from '@/lib/activity/goal-activity';
import {
  HEATMAP_INTENSITY_LEVELS,
  groupBucketsIntoWeeks,
  heatmapIntensityLevel,
} from '@/lib/activity/activity-heatmap';

// Pure render of the L1 goal-activity window as a GitHub-style heatmap
// (design/001 Part B "Render contract"). Consumes ActivityDayBucket[] as props
// over a longer `days` window than the 7-day row — no DB access here
// (features/CLAUDE.md rule 3). The pure week-grouping + intensity math lives in
// lib/activity/activity-heatmap.ts; this component is a thin single-hue grid.

const WEEKDAY_INITIALS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'] as const; // Mon→Sun
const WEEKDAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;
const CELL = 12;
const CELL_GAP = 3;

/** Single-hue (OHARA green) ramp: index 0 is empty, 1..N ramp up by alpha. */
function levelBackground(level: number, emptyColor: string): string {
  if (level <= 0) return emptyColor;
  const alphas = [0.28, 0.48, 0.72, 1]; // one per HEATMAP_INTENSITY_LEVELS
  const alpha = alphas[Math.min(alphas.length, Math.max(1, level)) - 1];
  return `rgba(99,193,116,${alpha})`; // OHARA_ACCENT_PRIMARY (#63C174), identical in both themes
}

function cellAccessibilityLabel(bucket: ActivityDayBucket): string {
  const weekday = WEEKDAY_NAMES[bucket.isoWeekday - 1] ?? '';
  const todaySuffix = bucket.isToday ? ', today' : '';
  const plural = bucket.count === 1 ? 'event' : 'events';
  return `${weekday}, ${bucket.date}${todaySuffix}: ${bucket.count} ${plural}`;
}

export function GoalActivityHeatmap({
  buckets,
  loading = false,
}: {
  buckets: readonly ActivityDayBucket[];
  loading?: boolean;
}) {
  const colors = useThemeColors();
  const emptyColor = colors.background.subtle;
  const { weeks, maxCount } = groupBucketsIntoWeeks(loading ? [] : [...buckets]);

  if (weeks.length === 0) {
    return (
      <Typography variant="caption" style={{ color: colors.text.muted }}>
        {loading ? 'Loading activity…' : 'No activity in this window yet.'}
      </Typography>
    );
  }

  return (
    <View style={{ gap: SPACE.sm }}>
      <View style={{ flexDirection: 'row', gap: CELL_GAP }} accessibilityLabel="Goal activity heatmap">
        {/* Weekday label gutter (M/W/F, GitHub-style). */}
        <View style={{ gap: CELL_GAP, marginRight: SPACE.xs }}>
          {WEEKDAY_INITIALS.map((initial, weekday) => (
            <View key={weekday} style={{ height: CELL, justifyContent: 'center', width: CELL }}>
              {weekday % 2 === 0 ? (
                <Typography variant="caption" style={{ color: colors.text.muted, fontSize: 9, lineHeight: 10 }}>
                  {initial}
                </Typography>
              ) : null}
            </View>
          ))}
        </View>
        {weeks.map((week, weekIndex) => (
          <View key={weekIndex} style={{ gap: CELL_GAP }}>
            {week.map((bucket, weekday) => {
              const level = bucket ? heatmapIntensityLevel(bucket.count, maxCount) : 0;
              return (
                <View
                  key={bucket?.date ?? `pad-${weekIndex}-${weekday}`}
                  accessibilityLabel={bucket ? cellAccessibilityLabel(bucket) : undefined}
                  style={{
                    backgroundColor: bucket ? levelBackground(level, emptyColor) : 'transparent',
                    borderColor: bucket?.isToday ? colors.border.accent : 'transparent',
                    borderRadius: 3,
                    borderWidth: bucket?.isToday ? 1.5 : 0,
                    height: CELL,
                    width: CELL,
                  }}
                />
              );
            })}
          </View>
        ))}
      </View>
      {/* Less → More legend. */}
      <View style={{ alignItems: 'center', alignSelf: 'flex-end', flexDirection: 'row', gap: CELL_GAP }}>
        <Typography variant="caption" style={{ color: colors.text.muted, fontSize: 9 }}>Less</Typography>
        {Array.from({ length: HEATMAP_INTENSITY_LEVELS + 1 }, (_, level) => (
          <View
            key={level}
            style={{
              backgroundColor: levelBackground(level, emptyColor),
              borderRadius: 2,
              height: 10,
              width: 10,
            }}
          />
        ))}
        <Typography variant="caption" style={{ color: colors.text.muted, fontSize: 9 }}>More</Typography>
      </View>
    </View>
  );
}
