import { useMemo, useState } from 'react';
import { Pressable, View, useWindowDimensions } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Card } from '@/components/ui/Card';
import { Typography } from '@/components/ui/Typography';
import { RADIUS, SPACE } from '@/constants/design';
import { addLocalDays, startOfIsoWeekYmd } from '@/lib/time/zoned-calendar';
import { useThemeColors } from '@/store/uiStore';
import { calendarItemLocalDate, todayYmd } from '../domain';
import type { CalendarAccessState } from '../providers/types';
import type { CalendarItem } from '../types';
import { calendarTimeLabel } from './CalendarItemRow';

function localCalendarDate(ymd: string): Date {
  return new Date(`${ymd}T12:00:00`);
}

function weekLabel(days: string[]): string {
  const first = localCalendarDate(days[0]);
  const last = localCalendarDate(days[days.length - 1]);
  const firstLabel = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(first);
  const lastLabel = first.getMonth() === last.getMonth()
    ? `${last.getDate()}, ${last.getFullYear()}`
    : new Intl.DateTimeFormat('en-US', { day: 'numeric', month: 'short', year: 'numeric' }).format(last);
  return `${firstLabel} – ${lastLabel}`;
}

export function HomeCalendarPreview({
  accessState,
  items,
  isLoading,
}: {
  accessState: CalendarAccessState;
  items: CalendarItem[];
  isLoading: boolean;
}) {
  const colors = useThemeColors();
  const { width } = useWindowDimensions();
  const today = todayYmd();
  const days = useMemo(() => {
    const start = startOfIsoWeekYmd(today);
    return Array.from({ length: 7 }, (_, index) => addLocalDays(start, index));
  }, [today]);
  const [selectedDate, setSelectedDate] = useState(today);
  const itemsByDate = useMemo(() => {
    const grouped = new Map<string, CalendarItem[]>();
    for (const item of items) {
      const date = calendarItemLocalDate(item);
      grouped.set(date, [...(grouped.get(date) ?? []), item]);
    }
    for (const rows of grouped.values()) {
      rows.sort((a, b) => {
        if (a.allDay !== b.allDay) return a.allDay ? -1 : 1;
        return a.startAt.localeCompare(b.startAt);
      });
    }
    return grouped;
  }, [items]);
  const selectedItems = itemsByDate.get(selectedDate) ?? [];
  const compact = width < 620;

  return (
    <Card elevation="sm" padding="spacious" style={{ borderWidth: 0, minHeight: compact ? 470 : 602 }}>
      <View style={{ alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' }}>
        <View style={{ alignItems: 'center', flexDirection: 'row', gap: SPACE.md }}>
          <View style={{ alignItems: 'center', backgroundColor: colors.background.selectedRow, borderRadius: RADIUS.round, height: 36, justifyContent: 'center', width: 36 }}>
            <Ionicons color={colors.text.accent} name="calendar-outline" size={19} />
          </View>
          <View>
            <Typography variant="eyebrow">Calendar</Typography>
            <Typography variant="caption" style={{ color: colors.text.secondary, marginTop: 2 }}>
              {weekLabel(days)}
            </Typography>
          </View>
        </View>
        <Pressable accessibilityLabel="View full Calendar" accessibilityRole="button" onPress={() => router.push('/calendar')}>
          <Typography variant="label" style={{ color: colors.text.accent }}>{compact ? 'Open →' : 'View Calendar →'}</Typography>
        </Pressable>
      </View>

      <View
        accessibilityLabel="This week"
        style={{
          backgroundColor: colors.background.subtle,
          borderRadius: RADIUS.lg,
          flexDirection: 'row',
          gap: compact ? 2 : SPACE.xs,
          marginTop: SPACE['3xl'],
          padding: compact ? SPACE.sm : SPACE.md,
        }}
      >
        {days.map((date) => {
          const parsed = localCalendarDate(date);
          const selected = date === selectedDate;
          const isToday = date === today;
          const itemCount = itemsByDate.get(date)?.length ?? 0;
          return (
            <Pressable
              accessibilityLabel={`${new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).format(parsed)}, ${itemCount} ${itemCount === 1 ? 'item' : 'items'}`}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              key={date}
              onPress={() => setSelectedDate(date)}
              style={({ pressed }) => ({
                alignItems: 'center',
                backgroundColor: selected ? colors.background.card : 'transparent',
                borderColor: isToday ? colors.border.accent : 'transparent',
                borderRadius: RADIUS.md,
                borderWidth: 1,
                flex: 1,
                minHeight: compact ? 68 : 82,
                opacity: pressed ? 0.7 : 1,
                paddingHorizontal: 2,
                paddingVertical: compact ? SPACE.sm : SPACE.md,
              })}
            >
              <Typography variant="meta" style={{ color: selected ? colors.text.accent : colors.text.muted }}>
                {new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(parsed).slice(0, compact ? 1 : 3)}
              </Typography>
              <Typography variant="emphasis-sm" style={{ fontSize: compact ? 15 : 17, marginTop: SPACE.xs }}>{parsed.getDate()}</Typography>
              <View style={{ alignItems: 'center', flexDirection: 'row', gap: 3, height: 8, marginTop: SPACE.xs }}>
                {Array.from({ length: Math.min(itemCount, 3) }, (_, index) => (
                  <View key={`${date}-item-${index}`} style={{ backgroundColor: index === 0 ? colors.accent.primary : colors.accent.tealMid, borderRadius: RADIUS.round, height: 4, width: 4 }} />
                ))}
              </View>
            </Pressable>
          );
        })}
      </View>

      <View style={{ flex: 1, marginTop: SPACE['3xl'] }}>
        <View style={{ alignItems: 'baseline', flexDirection: 'row', justifyContent: 'space-between' }}>
          <View>
            <Typography variant="eyebrow" style={{ color: selectedDate === today ? colors.text.accent : colors.text.muted }}>
              {selectedDate === today ? 'Today' : new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(localCalendarDate(selectedDate))}
            </Typography>
            <Typography variant="title" style={{ fontSize: compact ? 19 : 22, marginTop: SPACE.xs }}>
              {new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric' }).format(localCalendarDate(selectedDate))}
            </Typography>
          </View>
          <Typography variant="meta" style={{ color: colors.text.muted }}>
            {selectedItems.length} {selectedItems.length === 1 ? 'item' : 'items'}
          </Typography>
        </View>

        <View style={{ gap: SPACE.sm, marginTop: SPACE.xl }}>
          {isLoading ? (
            <Typography variant="caption" style={{ color: colors.text.muted }}>Loading this week…</Typography>
          ) : selectedItems.length ? selectedItems.slice(0, compact ? 3 : 4).map((item) => (
            <Pressable
              accessibilityLabel={`Open ${item.title} in Calendar`}
              accessibilityRole="button"
              key={item.id}
              onPress={() => router.push({ pathname: '/calendar', params: { date: selectedDate } })}
              style={({ pressed }) => ({
                alignItems: 'center',
                backgroundColor: pressed ? colors.background.selectedRow : colors.background.subtle,
                borderColor: colors.border.warmSubtle,
                borderRadius: RADIUS.md,
                borderWidth: 1,
                flexDirection: 'row',
                gap: SPACE.lg,
                minHeight: compact ? 54 : 62,
                opacity: pressed ? 0.75 : 1,
                paddingHorizontal: SPACE.lg,
                paddingVertical: SPACE.sm,
              })}
            >
              <View style={{ alignItems: 'center', minWidth: compact ? 52 : 66 }}>
                <Typography variant="caption" style={{ color: item.allDay ? colors.text.muted : colors.text.accent }}>{calendarTimeLabel(item)}</Typography>
              </View>
              <View style={{ backgroundColor: item.isExternal ? colors.text.muted : colors.accent.primary, borderRadius: RADIUS.round, height: 7, width: 7 }} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Typography numberOfLines={1} variant="emphasis-sm">{item.title}</Typography>
                <Typography numberOfLines={1} variant="meta" style={{ color: colors.text.secondary, marginTop: 2 }}>
                  {[item.contextTitle, item.projectTitle].filter(Boolean).join(' · ') || (item.isExternal ? 'Personal Calendar' : 'OHARA')}
                </Typography>
              </View>
              <Ionicons color={colors.text.muted} name="chevron-forward" size={16} />
            </Pressable>
          )) : (
            <View style={{ alignItems: 'center', flex: 1, justifyContent: 'center', minHeight: compact ? 120 : 180, paddingVertical: SPACE.xl }}>
              <View style={{ alignItems: 'center', backgroundColor: colors.background.subtle, borderRadius: RADIUS.round, height: 44, justifyContent: 'center', width: 44 }}>
                <Ionicons color={colors.text.muted} name="sunny-outline" size={21} />
              </View>
              <Typography variant="body" style={{ marginTop: SPACE.lg }}>Your day is open.</Typography>
              <Typography variant="caption" style={{ color: colors.text.secondary, marginTop: SPACE.xs, textAlign: 'center' }}>
                Scheduled Tasks, Milestones, and deadlines will appear here.
              </Typography>
            </View>
          )}
        </View>
      </View>

      {accessState !== 'granted' ? (
        <View style={{ alignItems: 'center', borderTopColor: colors.border.divider, borderTopWidth: 1, flexDirection: 'row', gap: SPACE.sm, marginTop: SPACE.xl, paddingTop: SPACE.lg }}>
          <Ionicons color={colors.text.muted} name="phone-portrait-outline" size={14} />
          <Typography variant="meta" style={{ color: colors.text.muted, flex: 1 }}>Apple Calendar is optional. OHARA items always work on their own.</Typography>
        </View>
      ) : null}
    </Card>
  );
}
