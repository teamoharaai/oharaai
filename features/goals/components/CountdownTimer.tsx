import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  Text,
  View,
  type GestureResponderEvent,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { AnchoredPopover, type AnchorRect } from '@/components/ui/AnchoredPopover';
import {
  DatePicker,
  formatCalendarDate,
  parseCalendarDate,
} from '@/components/ui/DatePicker';
import { Typography } from '@/components/ui/Typography';
import { FONT, RADIUS, SPACE, TYPE } from '@/constants/design';
import { useThemeColors } from '@/store/uiStore';

interface CountdownTimerProps {
  createdAt: Date;
  deadline: Date | null;
  disabled?: boolean;
  embedded?: boolean;
  onUpdateDeadline: (deadline: Date | null) => Promise<boolean>;
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  overdue: boolean;
}

const MINUTE_MS = 60_000;
const DAY_MS = 86_400_000;

function getTimeLeft(deadline: Date | null, now: number): TimeLeft {
  if (!deadline) return { days: 0, hours: 0, minutes: 0, overdue: false };
  const diff = deadline.getTime() - now;
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, overdue: true };
  return {
    days: Math.floor(diff / DAY_MS),
    hours: Math.floor((diff % DAY_MS) / (60 * MINUTE_MS)),
    minutes: Math.floor((diff % (60 * MINUTE_MS)) / MINUTE_MS),
    overdue: false,
  };
}

function getElapsed(createdAt: Date, deadline: Date | null, now: number) {
  if (!deadline) return { elapsedDays: 0, totalDays: 0, percentage: 0 };
  const start = createdAt.getTime();
  const end = deadline.getTime();
  const span = Math.max(0, end - start);
  if (span === 0) return { elapsedDays: 0, totalDays: 0, percentage: 100 };
  const elapsed = Math.min(span, Math.max(0, now - start));
  return {
    elapsedDays: Math.min(Math.ceil(span / DAY_MS), Math.floor(elapsed / DAY_MS) + 1),
    totalDays: Math.max(1, Math.ceil(span / DAY_MS)),
    percentage: Math.min(100, Math.max(0, (elapsed / span) * 100)),
  };
}

function formatDateInput(date: Date | null): string {
  return date ? formatCalendarDate(date) : '';
}

function parseDateInput(value: string): Date | null | undefined {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = parseCalendarDate(trimmed);
  if (!parsed) return undefined;
  parsed.setHours(12, 0, 0, 0);
  return parsed;
}

function TimeValue({ value, unit }: { value: number; unit: string }) {
  const colors = useThemeColors();

  return (
    <View style={{ alignItems: 'baseline', flexDirection: 'row', gap: 3 }}>
      <Text
        style={{
          color: colors.text.accent,
          fontFamily: FONT.ui.bold,
          fontSize: 22,
          fontVariant: ['tabular-nums'],
          lineHeight: 24,
        }}
      >
        {String(value).padStart(2, '0')}
      </Text>
      <Text style={{ color: colors.text.secondary, ...TYPE.meta }}>
        {unit}
      </Text>
    </View>
  );
}

export function CountdownTimer({
  createdAt,
  deadline,
  disabled = false,
  embedded = false,
  onUpdateDeadline,
}: CountdownTimerProps) {
  const colors = useThemeColors();
  const [now, setNow] = useState(() => Date.now());
  const [menuOpen, setMenuOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [anchorRect, setAnchorRect] = useState<AnchorRect | null>(null);
  const [dateInput, setDateInput] = useState(() => formatDateInput(deadline));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const menuButtonRef = useRef<View>(null);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), MINUTE_MS);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!calendarOpen) setDateInput(formatDateInput(deadline));
  }, [calendarOpen, deadline]);

  const timeLeft = useMemo(() => getTimeLeft(deadline, now), [deadline, now]);
  const elapsed = useMemo(() => getElapsed(createdAt, deadline, now), [createdAt, deadline, now]);

  async function saveDeadline(value: string) {
    const parsed = parseDateInput(value);
    if (parsed === undefined) {
      setError('Choose a valid end date.');
      return;
    }
    setSaving(true);
    setError(null);
    const saved = await onUpdateDeadline(parsed);
    setSaving(false);
    if (!saved) {
      setError('Could not update the end date. Try again.');
      return;
    }
  }

  function openMenu(event: GestureResponderEvent) {
    const node = menuButtonRef.current as
      | (View & {
          measureInWindow?: (
            callback: (x: number, y: number, width: number, height: number) => void,
          ) => void;
        })
      | null;

    if (node?.measureInWindow) {
      node.measureInWindow((x, y, width, height) => {
        setAnchorRect({ x, y, width, height, top: y, left: x, right: x + width, bottom: y + height });
        setMenuOpen(true);
      });
      return;
    }

    const currentTarget = (
      event as GestureResponderEvent & {
        currentTarget?: { getBoundingClientRect?: () => DOMRect };
      }
    ).currentTarget;
    const rect = currentTarget?.getBoundingClientRect?.();
    if (rect) {
      setAnchorRect({
        x: rect.left,
        y: rect.top,
        width: rect.width,
        height: rect.height,
        top: rect.top,
        left: rect.left,
        right: rect.right,
        bottom: rect.bottom,
      });
    }
    setMenuOpen(true);
  }

  function editDate() {
    setMenuOpen(false);
    setDateInput(formatDateInput(deadline));
    setError(null);
    setCalendarOpen(true);
  }

  const caption = !deadline
    ? 'Choose a goal end date'
    : timeLeft.overdue
      ? 'End date reached'
      : `Day ${elapsed.elapsedDays} of ${elapsed.totalDays}`;

  return (
    <View style={{ marginBottom: embedded ? 0 : 16 }}>
      <View
        style={{
          alignItems: 'center',
          backgroundColor: colors.background.sidebar,
          borderRadius: 16,
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: 18,
          minHeight: 56,
          paddingHorizontal: 20,
          paddingVertical: 14,
          shadowColor: embedded ? 'transparent' : '#000',
          shadowOffset: { width: 0, height: 3 },
          shadowOpacity: embedded ? 0 : 0.1,
          shadowRadius: embedded ? 0 : 16,
          elevation: embedded ? 0 : 2,
        }}
      >
        <Text
          style={{
            color: colors.text.accent,
            ...TYPE.overline,
            fontFamily: FONT.ui.semibold,
            letterSpacing: 1.5,
            textTransform: 'uppercase',
          }}
        >
          Goal ends in
        </Text>

        {deadline ? (
          <View style={{ alignItems: 'center', flexDirection: 'row', gap: 9 }}>
            <TimeValue value={timeLeft.days} unit="d" />
            <TimeValue value={timeLeft.hours} unit="h" />
            <TimeValue value={timeLeft.minutes} unit="m" />
          </View>
        ) : (
          <Text style={{ color: colors.text.primary, ...TYPE.bodySmall, fontFamily: FONT.ui.semibold }}>
            Not set
          </Text>
        )}

        <View style={{ flex: 1, gap: 5, minWidth: 120 }}>
          <View
            style={{
              backgroundColor: colors.border.divider,
              borderRadius: 3,
              height: 4,
              overflow: 'hidden',
            }}
          >
            <LinearGradient
              colors={[colors.accent.tealMid, colors.accent.teal]}
              end={{ x: 1, y: 0 }}
              start={{ x: 0, y: 0 }}
              style={{ height: 4, width: `${elapsed.percentage}%` as `${number}%` }}
            />
          </View>
          <Text style={{ color: colors.text.secondary, ...TYPE.meta }}>
            {caption}
          </Text>
        </View>

        <View collapsable={false} ref={menuButtonRef}>
          <Pressable
            accessibilityLabel="More end date actions"
            accessibilityRole="button"
            accessibilityState={{ disabled: disabled || saving, expanded: menuOpen }}
            disabled={disabled || saving}
            onPress={openMenu}
            style={({ pressed }) => ({
              alignItems: 'center',
              backgroundColor: colors.background.input,
              borderColor: colors.border.divider,
              borderWidth: 1,
              borderRadius: 8,
              height: 28,
              justifyContent: 'center',
              opacity: disabled ? 0.45 : pressed ? 0.7 : 1,
              width: 28,
            })}
          >
            {saving ? (
              <ActivityIndicator color={colors.text.accent} size="small" />
            ) : (
              <Text style={{ color: colors.text.accent, fontFamily: 'Inter-Regular', fontSize: 16, letterSpacing: 1 }}>⋯</Text>
            )}
          </Pressable>
        </View>
      </View>

      {error ? (
        <Typography variant="hint" style={{ color: colors.feedback.danger.text, marginTop: SPACE.sm }}>
          {error}
        </Typography>
      ) : null}

      <AnchoredPopover
        anchorRect={anchorRect}
        contentStyle={{ minWidth: 164, padding: SPACE.sm }}
        onDismiss={() => setMenuOpen(false)}
        visible={menuOpen}
      >
        <Pressable
          accessibilityLabel="Edit goal end date"
          accessibilityRole="menuitem"
          onPress={editDate}
          style={({ pressed }) => ({
            alignItems: 'center',
            backgroundColor: pressed ? colors.background.selectedRow : 'transparent',
            borderRadius: RADIUS.sm,
            flexDirection: 'row',
            gap: SPACE.md,
            minHeight: 44,
            paddingHorizontal: SPACE.lg,
          })}
        >
          <Ionicons color={colors.text.accent} name="calendar-outline" size={17} />
          <Typography variant="control">Edit date</Typography>
        </Pressable>
      </AnchoredPopover>

      <DatePicker
        accessibilityLabel="Goal end date"
        allowClear
        disabled={saving}
        error={error}
        hideTrigger
        onChange={(value) => {
          setDateInput(value);
          setError(null);
          void saveDeadline(value);
        }}
        onOpenChange={setCalendarOpen}
        open={calendarOpen}
        placeholder="Choose an end date"
        value={dateInput}
      />
    </View>
  );
}
