import { useState } from 'react';
import { View } from 'react-native';
import { Typography } from '@/components/ui/Typography';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { RADIUS, SPACE } from '@/constants/design';
import { useThemeColors } from '@/store/uiStore';
import type { ActivityDayBucket } from '@/lib/activity/goal-activity';
import { heatmapIntensityLevel } from '@/lib/activity/activity-heatmap';
import {
  buildCurrentMonth,
  buildCurrentWeek,
  type CalendarDaySlot,
  type CurrentMonth,
  type CurrentWeek,
} from '@/lib/activity/calendar-activity';

// Merged ACTIVITY panel (design/001 Part B). One derivation, many renders: the
// Week and Month views are calendar-aligned renders of the SAME activity window
// (features/CLAUDE.md rule 3 — data arrives as props, no DB access here). Week
// shows the current Monday→Sunday week; Month shows the current calendar month
// as a wall-calendar grid. Both use the single-hue OHARA-green intensity ramp so
// the two toggle states read as one system.

type ActivityView = 'week' | 'month';

const VIEW_OPTIONS: ReadonlyArray<{ value: ActivityView; label: string }> = [
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
];

const WEEKDAY_INITIALS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'] as const; // Mon→Sun
const WEEKDAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
] as const;
const CELL_GAP = 4;

type ThemeColors = ReturnType<typeof useThemeColors>;

/** Single-hue (OHARA green) ramp: level 0 is empty, 1..N ramp up by alpha. */
function levelBackground(level: number, emptyColor: string): string {
  if (level <= 0) return emptyColor;
  const alphas = [0.28, 0.48, 0.72, 1]; // one per HEATMAP_INTENSITY_LEVELS
  const alpha = alphas[Math.min(alphas.length, Math.max(1, level)) - 1];
  return `rgba(99,193,116,${alpha})`; // OHARA_ACCENT_PRIMARY (#63C174), identical in both themes
}

function slotAccessibilityLabel(slot: CalendarDaySlot): string {
  const weekday = WEEKDAY_NAMES[slot.isoWeekday - 1] ?? '';
  if (slot.isFuture) return `${weekday}, ${slot.date}: upcoming`;
  const todaySuffix = slot.isToday ? ', today' : '';
  const plural = slot.count === 1 ? 'event' : 'events';
  return `${weekday}, ${slot.date}${todaySuffix}: ${slot.count} ${plural}`;
}

function WeekView({ week, colors }: { week: CurrentWeek; colors: ThemeColors }) {
  const emptyColor = colors.background.subtle;
  return (
    <View style={{ flexDirection: 'row', gap: SPACE.md }} accessibilityLabel="Activity this week, Monday to Sunday">
      {week.slots.map((slot, index) => {
          const level = heatmapIntensityLevel(slot.count, week.maxCount);
          return (
            <View
              key={slot.date}
              accessibilityLabel={slotAccessibilityLabel(slot)}
              style={{ alignItems: 'center', flex: 1, gap: SPACE.xs }}
            >
              <View
                style={{
                  alignItems: 'center',
                  backgroundColor: slot.isFuture ? 'transparent' : levelBackground(level, emptyColor),
                  borderColor: slot.isToday
                    ? colors.border.accent
                    : slot.isFuture
                      ? colors.border.input
                      : 'transparent',
                  borderRadius: RADIUS.round,
                  borderStyle: slot.isFuture ? 'dashed' : 'solid',
                  borderWidth: slot.isToday ? 2 : slot.isFuture ? 1 : 0,
                  height: 24,
                  justifyContent: 'center',
                  opacity: slot.isFuture ? 0.6 : 1,
                  width: 24,
                }}
              />
              <Typography
                variant="caption"
                style={{ color: slot.isToday ? colors.text.accent : colors.text.muted }}
              >
                {WEEKDAY_INITIALS[index]}
              </Typography>
            </View>
          );
        })}
    </View>
  );
}

function MonthView({ month, colors }: { month: CurrentMonth; colors: ThemeColors }) {
  const emptyColor = colors.background.subtle;
  return (
    <View style={{ gap: SPACE.sm }}>
      <Typography variant="emphasis-sm" style={{ alignSelf: 'center' }}>
        {MONTH_NAMES[month.month - 1]} {month.year}
      </Typography>
      <View style={{ flexDirection: 'row', gap: CELL_GAP }}>
        {WEEKDAY_INITIALS.map((initial, weekday) => (
          <View key={weekday} style={{ alignItems: 'center', flex: 1 }}>
            <Typography variant="caption" style={{ color: colors.text.muted, fontSize: 10 }}>
              {initial}
            </Typography>
          </View>
        ))}
      </View>
      <View
        style={{ gap: CELL_GAP }}
        accessibilityLabel={`Activity for ${MONTH_NAMES[month.month - 1]} ${month.year}`}
      >
        {month.weeks.map((week, weekIndex) => (
          <View key={weekIndex} style={{ flexDirection: 'row', gap: CELL_GAP }}>
            {week.map((slot, weekday) => {
              if (!slot) {
                return <View key={`pad-${weekIndex}-${weekday}`} style={{ aspectRatio: 1, flex: 1 }} />;
              }
              const level = heatmapIntensityLevel(slot.count, month.maxCount);
              const darkFill = !slot.isFuture && level >= 3;
              return (
                <View
                  key={slot.date}
                  accessibilityLabel={slotAccessibilityLabel(slot)}
                  style={{
                    alignItems: 'center',
                    aspectRatio: 1,
                    backgroundColor: slot.isFuture ? 'transparent' : levelBackground(level, emptyColor),
                    borderColor: slot.isToday ? colors.border.accent : 'transparent',
                    borderRadius: RADIUS.sm,
                    borderWidth: slot.isToday ? 1.5 : 0,
                    flex: 1,
                    justifyContent: 'center',
                    opacity: slot.isFuture ? 0.5 : 1,
                  }}
                >
                  <Typography
                    variant="caption"
                    style={{
                      color: darkFill
                        ? '#FFFFFF'
                        : slot.isToday
                          ? colors.text.accent
                          : colors.text.secondary,
                      fontSize: 11,
                    }}
                  >
                    {slot.dayOfMonth}
                  </Typography>
                </View>
              );
            })}
          </View>
        ))}
      </View>
    </View>
  );
}

export function GoalActivityPanel({
  buckets,
  loading = false,
}: {
  buckets: readonly ActivityDayBucket[];
  loading?: boolean;
}) {
  const colors = useThemeColors();
  const [view, setView] = useState<ActivityView>('week');
  // The window always ends on today, so the last bucket's date IS today (asOf).
  const asOf = buckets.length ? buckets[buckets.length - 1].date : null;

  return (
    <View style={{ gap: SPACE.lg }}>
      <SegmentedControl
        compact
        options={VIEW_OPTIONS}
        value={view}
        onChange={setView}
        accessibilityLabel="Activity range"
      />
      {loading || !asOf ? (
        <Typography variant="caption" style={{ color: colors.text.muted }}>
          Loading activity…
        </Typography>
      ) : view === 'week' ? (
        <WeekView week={buildCurrentWeek(buckets, asOf)} colors={colors} />
      ) : (
        <MonthView month={buildCurrentMonth(buckets, asOf)} colors={colors} />
      )}
    </View>
  );
}
