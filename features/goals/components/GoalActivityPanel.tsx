import { useState, type ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { Typography } from '@/components/ui/Typography';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { RADIUS, SPACE } from '@/constants/design';
import { useThemeColors } from '@/store/uiStore';
import type { ActivityDayBucket, GoalActivityKind } from '@/lib/activity/goal-activity';
import { GOAL_ACTIVITY_KIND_ORDER } from '@/lib/activity/goal-activity';
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
// the two toggle states read as one system. Hovering (or tapping) a day floats a
// per-kind quick-stat summary (tasks / entries / milestones) from slot.byKind.

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
/** User-facing label per kind for the hover summary. */
const KIND_SUMMARY_LABELS: Record<GoalActivityKind, string> = {
  task_completed: 'Tasks',
  entry_created: 'Entries',
  milestone_completed: 'Milestones',
};
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
  if (slot.count === 0) return `${weekday}, ${slot.date}${todaySuffix}: no activity`;
  const parts = GOAL_ACTIVITY_KIND_ORDER
    .filter((kind) => slot.byKind[kind] > 0)
    .map((kind) => `${slot.byKind[kind]} ${KIND_SUMMARY_LABELS[kind].toLowerCase()}`);
  return `${weekday}, ${slot.date}${todaySuffix}: ${parts.join(', ')}`;
}

/** Floating per-kind quick-stat summary, anchored above the hovered day cell. */
function DayTooltip({ slot, colors }: { slot: CalendarDaySlot; colors: ThemeColors }) {
  const monthShort = MONTH_NAMES[Number(slot.date.split('-')[1]) - 1]?.slice(0, 3) ?? '';
  const dateLabel = `${WEEKDAY_NAMES[slot.isoWeekday - 1]}, ${monthShort} ${slot.dayOfMonth}`;
  // Anchor to the cell edge on boundary columns so the fixed-width card never
  // overflows the panel and slides under the neighbouring Intelligence/Tasks
  // columns; only the middle of the week is centred over its cell.
  const horizontal =
    slot.isoWeekday <= 2
      ? { left: 0 }
      : slot.isoWeekday >= 6
        ? { right: 0 }
        : { left: '50%' as const, marginLeft: -84 };
  return (
    <View
      pointerEvents="none"
      style={{
        backgroundColor: colors.background.card,
        borderColor: colors.border.warm,
        borderRadius: RADIUS.md,
        borderWidth: 1,
        bottom: '100%',
        elevation: 8,
        gap: SPACE.xs,
        marginBottom: SPACE.sm,
        padding: SPACE.md,
        position: 'absolute',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.14,
        shadowRadius: 10,
        width: 168,
        zIndex: 40,
        ...horizontal,
      }}
    >
      <Typography variant="caption" style={{ color: colors.text.secondary }}>
        {dateLabel}
      </Typography>
      {slot.isFuture ? (
        <Typography variant="caption" style={{ color: colors.text.muted }}>Upcoming</Typography>
      ) : slot.count === 0 ? (
        <Typography variant="caption" style={{ color: colors.text.muted }}>No activity</Typography>
      ) : (
        GOAL_ACTIVITY_KIND_ORDER.map((kind) => {
          const value = slot.byKind[kind];
          return (
            <View key={kind} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Typography variant="caption" style={{ color: value ? colors.text.secondary : colors.text.muted }}>
                {KIND_SUMMARY_LABELS[kind]}
              </Typography>
              <Typography variant="caption" style={{ color: value ? colors.text.accent : colors.text.muted }}>
                {value}
              </Typography>
            </View>
          );
        })
      )}
    </View>
  );
}

/** Wraps a day cell so hover (web) or tap (touch) reveals its summary tooltip. */
function DayCell({
  slot,
  hovered,
  setHovered,
  colors,
  style,
  children,
}: {
  slot: CalendarDaySlot;
  hovered: string | null;
  setHovered: (date: string | null) => void;
  colors: ThemeColors;
  style?: object;
  children: ReactNode;
}) {
  const active = hovered === slot.date;
  return (
    <Pressable
      accessibilityLabel={slotAccessibilityLabel(slot)}
      onHoverIn={() => setHovered(slot.date)}
      onHoverOut={() => setHovered(null)}
      onPress={() => setHovered(active ? null : slot.date)}
      style={{ alignItems: 'center', justifyContent: 'center', position: 'relative', zIndex: active ? 40 : 0, ...style }}
    >
      {active ? <DayTooltip slot={slot} colors={colors} /> : null}
      {children}
    </Pressable>
  );
}

function WeekView({
  week,
  hovered,
  setHovered,
  colors,
}: {
  week: CurrentWeek;
  hovered: string | null;
  setHovered: (date: string | null) => void;
  colors: ThemeColors;
}) {
  const emptyColor = colors.background.subtle;
  return (
    <View style={{ flexDirection: 'row', gap: SPACE.md }} accessibilityLabel="Activity this week, Monday to Sunday">
      {week.slots.map((slot, index) => {
        const level = heatmapIntensityLevel(slot.count, week.maxCount);
        return (
          <View key={slot.date} style={{ alignItems: 'center', flex: 1, gap: SPACE.xs }}>
            <DayCell slot={slot} hovered={hovered} setHovered={setHovered} colors={colors}>
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
            </DayCell>
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

function MonthView({
  month,
  hovered,
  setHovered,
  colors,
}: {
  month: CurrentMonth;
  hovered: string | null;
  setHovered: (date: string | null) => void;
  colors: ThemeColors;
}) {
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
          <View key={weekIndex} style={{ flexDirection: 'row', gap: CELL_GAP, zIndex: week.some((s) => s?.date === hovered) ? 40 : 0 }}>
            {week.map((slot, weekday) => {
              if (!slot) {
                return <View key={`pad-${weekIndex}-${weekday}`} style={{ aspectRatio: 1, flex: 1 }} />;
              }
              const level = heatmapIntensityLevel(slot.count, month.maxCount);
              const darkFill = !slot.isFuture && level >= 3;
              return (
                <DayCell
                  key={slot.date}
                  slot={slot}
                  hovered={hovered}
                  setHovered={setHovered}
                  colors={colors}
                  style={{ aspectRatio: 1, flex: 1 }}
                >
                  <View
                    style={{
                      alignItems: 'center',
                      alignSelf: 'stretch',
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
                </DayCell>
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
  const [hovered, setHovered] = useState<string | null>(null);
  // The window always ends on today, so the last bucket's date IS today (asOf).
  const asOf = buckets.length ? buckets[buckets.length - 1].date : null;

  const changeView = (next: ActivityView) => {
    setView(next);
    setHovered(null); // dates differ across views — drop any stale tooltip target
  };

  return (
    <View style={{ gap: SPACE.lg }}>
      <SegmentedControl
        compact
        options={VIEW_OPTIONS}
        value={view}
        onChange={changeView}
        accessibilityLabel="Activity range"
      />
      {loading || !asOf ? (
        <Typography variant="caption" style={{ color: colors.text.muted }}>
          Loading activity…
        </Typography>
      ) : view === 'week' ? (
        <WeekView week={buildCurrentWeek(buckets, asOf)} hovered={hovered} setHovered={setHovered} colors={colors} />
      ) : (
        <MonthView month={buildCurrentMonth(buckets, asOf)} hovered={hovered} setHovered={setHovered} colors={colors} />
      )}
    </View>
  );
}
