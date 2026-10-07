import { Linking, Platform, Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { AuthenticatedPageShell } from '@/components/layout/AuthenticatedPageShell';
import { Card } from '@/components/ui/Card';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Typography } from '@/components/ui/Typography';
import { RADIUS, SPACE } from '@/constants/design';
import { addLocalDays } from '@/lib/time/zoned-calendar';
import { useThemeColors } from '@/store/uiStore';
import {
  calendarItemLocalDate,
  deviceTimezone,
  filterCalendarItems,
  groupCalendarItems,
  moveCalendarAnchor,
  rangeForView,
  todayYmd,
} from '../domain';
import { useCalendarItems } from '../hooks/useCalendarItems';
import { appleEventKitProvider } from '../providers/apple-eventkit';
import type { CalendarFilter, CalendarItem, CalendarView } from '../types';
import { calendarTimeLabel, CalendarItemRow } from './CalendarItemRow';

const VIEWS = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
] as const;
const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'ohara', label: 'OHARA' },
  { value: 'personal', label: 'Personal' },
  { value: 'projects', label: 'Projects' },
] as const;

function rangeTitle(startDate: string, endDate: string, view: CalendarView): string {
  const start = new Date(`${startDate}T12:00:00`);
  const end = new Date(`${endDate}T12:00:00`);
  if (view === 'today') return new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).format(start);
  if (view === 'month') return new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(start);
  const left = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(start);
  const right = start.getMonth() === end.getMonth()
    ? `${end.getDate()}, ${end.getFullYear()}`
    : new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(end);
  return `${left} – ${right}`;
}

function dayHeading(ymd: string): string {
  return new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date(`${ymd}T12:00:00`));
}

function ProviderCard({
  accessState,
  canConnect,
  onConnect,
}: {
  accessState: ReturnType<typeof useCalendarItems>['accessState'];
  canConnect: boolean;
  onConnect: () => void;
}) {
  const colors = useThemeColors();
  if (accessState === 'granted') {
    return (
      <View style={{ alignItems: 'center', flexDirection: 'row', gap: SPACE.sm }}>
        <Ionicons color={colors.text.accent} name="checkmark-circle" size={18} />
        <Typography variant="caption" style={{ color: colors.text.secondary }}>Apple Calendar connected</Typography>
      </View>
    );
  }
  if (!canConnect) {
    return (
      <Typography variant="caption" style={{ color: colors.text.muted }}>
        Apple Calendar connection is available in the iOS app. OHARA items remain fully available here.
      </Typography>
    );
  }
  return (
    <View style={{ alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.lg }}>
      <View style={{ flex: 1, minWidth: 210 }}>
        <Typography variant="emphasis-sm">Apple Calendar</Typography>
        <Typography variant="caption" style={{ color: colors.text.secondary, marginTop: 2 }}>
          Uses calendars configured on this iPhone. Access is optional and private to you.
        </Typography>
      </View>
      {accessState === 'denied' ? (
        <Pressable accessibilityLabel="Open Settings for Calendar access" accessibilityRole="button" onPress={() => void Linking.openSettings()}>
          <Typography variant="label" style={{ color: colors.text.accent }}>Open Settings</Typography>
        </Pressable>
      ) : (
        <Pressable
          accessibilityHint="Shows the native Calendar permission prompt"
          accessibilityLabel="Connect Apple Calendar"
          accessibilityRole="button"
          onPress={onConnect}
          style={({ pressed }) => ({ backgroundColor: colors.accent.primary, borderRadius: RADIUS.round, minHeight: 42, justifyContent: 'center', opacity: pressed ? 0.72 : 1, paddingHorizontal: SPACE.xl })}
        >
          <Typography variant="control" style={{ color: colors.text.onAccent }}>Connect</Typography>
        </Pressable>
      )}
    </View>
  );
}

function MonthGrid({ anchor, items, onSelect }: { anchor: string; items: CalendarItem[]; onSelect: (date: string) => void }) {
  const colors = useThemeColors();
  const range = rangeForView(anchor, 'month');
  const firstWeekday = (new Date(`${range.startDate}T12:00:00`).getDay() + 6) % 7;
  const cells = Array.from({ length: firstWeekday }, () => null as string | null);
  for (let date = range.startDate; date <= range.endDate; date = addLocalDays(date, 1)) cells.push(date);
  while (cells.length % 7 !== 0) cells.push(null);
  const itemsByDate = new Map<string, CalendarItem[]>();
  for (const item of items) {
    const date = calendarItemLocalDate(item);
    itemsByDate.set(date, [...(itemsByDate.get(date) ?? []), item]);
  }
  for (const rows of itemsByDate.values()) {
    rows.sort((a, b) => {
      if (a.allDay !== b.allDay) return a.allDay ? -1 : 1;
      return a.startAt.localeCompare(b.startAt);
    });
  }
  return (
    <View style={{ gap: SPACE.sm }}>
      <View style={{ flexDirection: 'row' }}>
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
          <Typography key={day} variant="meta" style={{ color: colors.text.muted, flex: 1, textAlign: 'center' }}>{day}</Typography>
        ))}
      </View>
      {Array.from({ length: cells.length / 7 }, (_, week) => (
        <View key={week} style={{ flexDirection: 'row', gap: SPACE.xs }}>
          {cells.slice(week * 7, week * 7 + 7).map((date, index) => {
            const dayItems = date ? itemsByDate.get(date) ?? [] : [];
            return (
              <View
                accessibilityLabel={date ? `${dayHeading(date)}, ${dayItems.length} ${dayItems.length === 1 ? 'item' : 'items'}` : 'Outside this month'}
                key={date ?? `empty-${index}`}
                style={{
                  backgroundColor: date === todayYmd() ? colors.background.selectedRow : colors.background.subtle,
                  borderColor: date === todayYmd() ? colors.border.accent : colors.border.subtle,
                  borderRadius: RADIUS.sm,
                  borderWidth: date ? 1 : 0,
                  flex: 1,
                  minHeight: 122,
                  opacity: date ? 1 : 0,
                  padding: SPACE.sm,
                }}
              >
                {date ? (
                  <>
                    <Pressable
                      accessibilityLabel={`Open ${dayHeading(date)}`}
                      accessibilityRole="button"
                      onPress={() => onSelect(date)}
                      style={({ pressed }) => ({ alignSelf: 'flex-start', opacity: pressed ? 0.55 : 1, paddingHorizontal: SPACE.xs, paddingVertical: 2 })}
                    >
                      <Typography variant="caption" style={{ color: date === todayYmd() ? colors.text.accent : colors.text.primary }}>
                        {Number(date.slice(-2))}
                      </Typography>
                    </Pressable>
                    <View style={{ gap: SPACE.xs, marginTop: SPACE.xs }}>
                      {dayItems.slice(0, 3).map((item) => (
                        <Pressable
                          accessibilityLabel={`Open ${item.title}, ${calendarTimeLabel(item)}`}
                          accessibilityRole="button"
                          key={item.id}
                          onPress={() => onSelect(date)}
                          style={({ pressed }) => ({
                            alignItems: 'center',
                            backgroundColor: item.isExternal ? colors.background.card : colors.background.hoverAccent,
                            borderRadius: RADIUS.xs,
                            flexDirection: 'row',
                            gap: SPACE.xs,
                            minHeight: 23,
                            opacity: pressed ? 0.65 : 1,
                            paddingHorizontal: SPACE.sm,
                          })}
                        >
                          <View style={{ backgroundColor: item.isExternal ? colors.text.muted : colors.accent.primary, borderRadius: RADIUS.round, height: 5, width: 5 }} />
                          <Typography numberOfLines={1} variant="meta" style={{ flex: 1 }}>{item.title}</Typography>
                        </Pressable>
                      ))}
                      {dayItems.length > 3 ? (
                        <Typography variant="meta" style={{ color: colors.text.muted, paddingHorizontal: SPACE.sm }}>+{dayItems.length - 3} more</Typography>
                      ) : null}
                    </View>
                  </>
                ) : null}
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

export function CalendarScreen() {
  const colors = useThemeColors();
  const params = useLocalSearchParams<{ date?: string | string[]; providerPreview?: string | string[] }>();
  const { width } = useWindowDimensions();
  const compact = width < 720;
  const initialDate = Array.isArray(params.date) ? params.date[0] : params.date;
  const [anchorDate, setAnchorDate] = useState(/^\d{4}-\d{2}-\d{2}$/.test(initialDate ?? '') ? initialDate! : todayYmd());
  const [view, setView] = useState<CalendarView>('month');
  const [filter, setFilter] = useState<CalendarFilter>('all');
  const range = useMemo(() => rangeForView(anchorDate, view, deviceTimezone()), [anchorDate, view]);
  const calendar = useCalendarItems(range);
  const providerPreview = Array.isArray(params.providerPreview) ? params.providerPreview[0] : params.providerPreview;
  const previewConnected = __DEV__ && providerPreview === 'connected';
  const previewItems: CalendarItem[] = previewConnected ? [{
    id: 'apple:visual-preview',
    sourceType: 'external_event',
    sourceId: 'visual-preview',
    title: 'Dentist',
    contextTitle: 'Personal Calendar',
    startAt: `${anchorDate}T15:30:00.000Z`,
    endAt: `${anchorDate}T16:30:00.000Z`,
    allDay: false,
    timezone: deviceTimezone(),
    provider: 'apple',
    calendarId: 'visual-preview',
    goalId: null,
    projectId: null,
    projectTitle: null,
    taskId: null,
    occurrenceId: null,
    isOharaItem: false,
    isExternal: true,
    status: 'active',
    visibility: 'private',
  }] : [];
  const allItems = useMemo(() => [...calendar.items, ...previewItems], [calendar.items, previewConnected]);
  const visible = useMemo(() => filterCalendarItems(allItems, filter), [allItems, filter]);
  const grouped = useMemo(() => groupCalendarItems(visible), [visible]);
  const [notice, setNotice] = useState<string | null>(null);

  async function exportItem(item: CalendarItem) {
    try {
      await appleEventKitProvider.createEvent({
        title: item.title,
        startAt: item.startAt,
        endAt: item.endAt,
        allDay: item.allDay,
        notes: `OHARA${item.contextTitle ? ` · ${item.contextTitle}` : ''}`,
      });
      setNotice('Added to Apple Calendar. OHARA remains the source of truth.');
    } catch {
      setNotice('Apple Calendar could not add this item.');
    }
  }

  return (
    <AuthenticatedPageShell>
      <View style={{ alignSelf: 'center', maxWidth: 1240, width: '100%' }}>
        <View style={{ alignItems: compact ? 'flex-start' : 'center', flexDirection: compact ? 'column' : 'row', gap: SPACE.xl, justifyContent: 'space-between' }}>
          <View>
            <Typography accessibilityRole="header" variant="heading">Calendar</Typography>
            <Typography variant="body" style={{ color: colors.text.secondary, marginTop: SPACE.xs }}>Your time, alongside what you&apos;re building.</Typography>
          </View>
          <SegmentedControl accessibilityLabel="Calendar view" compact={compact} onChange={setView} options={VIEWS} value={view} />
        </View>

        <Card elevation="sm" padding="spacious" style={{ borderWidth: 0, marginTop: SPACE['3xl'] }}>
          <ProviderCard accessState={previewConnected ? 'granted' : calendar.accessState} canConnect={calendar.canConnectApple} onConnect={() => void calendar.connect()} />
        </Card>

        <View style={{ alignItems: compact ? 'stretch' : 'center', flexDirection: compact ? 'column' : 'row', gap: SPACE.xl, justifyContent: 'space-between', marginTop: SPACE['3xl'] }}>
          <View style={{ alignItems: 'center', flexDirection: 'row', gap: SPACE.md }}>
            <Pressable accessibilityLabel="Previous date range" accessibilityRole="button" onPress={() => setAnchorDate(moveCalendarAnchor(anchorDate, view, -1))} style={{ padding: SPACE.md }}>
              <Ionicons color={colors.text.primary} name="chevron-back" size={20} />
            </Pressable>
            <Pressable accessibilityLabel="Go to today" accessibilityRole="button" onPress={() => setAnchorDate(todayYmd())}>
              <Typography variant="section-header" style={{ minWidth: compact ? 220 : 300, textAlign: 'center' }}>{rangeTitle(range.startDate, range.endDate, view)}</Typography>
            </Pressable>
            <Pressable accessibilityLabel="Next date range" accessibilityRole="button" onPress={() => setAnchorDate(moveCalendarAnchor(anchorDate, view, 1))} style={{ padding: SPACE.md }}>
              <Ionicons color={colors.text.primary} name="chevron-forward" size={20} />
            </Pressable>
          </View>
          <SegmentedControl accessibilityLabel="Calendar filters" compact onChange={setFilter} options={FILTERS} value={filter} />
        </View>

        {notice ? <Typography variant="caption" style={{ color: colors.text.accent, marginTop: SPACE.lg }}>{notice}</Typography> : null}
        {calendar.error ? <Typography variant="caption" style={{ color: colors.feedback.danger.text, marginTop: SPACE.lg }}>{calendar.error}</Typography> : null}

        {view === 'month' ? (
          <Card elevation="sm" padding="spacious" style={{ borderWidth: 0, marginTop: SPACE.xl }}>
            <ScrollView horizontal={compact} showsHorizontalScrollIndicator={compact}>
              <View style={{ minWidth: compact ? 760 : undefined, width: compact ? 760 : '100%' }}>
                <MonthGrid anchor={anchorDate} items={visible} onSelect={(date) => { setAnchorDate(date); setView('today'); }} />
              </View>
            </ScrollView>
          </Card>
        ) : null}

        {view !== 'month' ? <View style={{ gap: SPACE['3xl'], marginTop: SPACE['3xl'] }}>
          {calendar.isLoading ? (
            <Typography variant="caption" style={{ color: colors.text.muted }}>Loading your calendar…</Typography>
          ) : grouped.length ? grouped.map((group) => (
            <View key={group.date}>
              <Typography variant="eyebrow" style={{ color: group.date === todayYmd() ? colors.text.accent : colors.text.secondary, marginBottom: SPACE.md }}>
                {dayHeading(group.date)}
              </Typography>
              <View style={{ gap: SPACE.sm }}>
                {group.items.map((item) => (
                  <CalendarItemRow
                    item={item}
                    key={item.id}
                    onChanged={calendar.refresh}
                    onExport={(previewConnected || calendar.accessState === 'granted') ? (row) => void exportItem(row) : undefined}
                  />
                ))}
              </View>
            </View>
          )) : (
            <Card elevation="sm" padding="spacious" style={{ borderWidth: 0 }}>
              <Typography variant="body">Nothing scheduled in this range.</Typography>
              <Typography variant="caption" style={{ color: colors.text.secondary, marginTop: SPACE.xs }}>
                OHARA Tasks, Milestones, and Goal deadlines appear automatically when they have dates.
              </Typography>
            </Card>
          )}
        </View> : null}

        {Platform.OS === 'web' ? (
          <Typography variant="meta" style={{ color: colors.text.muted, marginTop: SPACE['3xl'] }}>
            External calendars are read-only context in OHARA. Google Calendar connection is planned separately from sign-in.
          </Typography>
        ) : null}
      </View>
    </AuthenticatedPageShell>
  );
}
