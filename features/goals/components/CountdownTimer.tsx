import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  DatePicker,
  formatCalendarDate,
  parseCalendarDate,
} from '@/components/ui/DatePicker';
import { Typography } from '@/components/ui/Typography';
import { useThemeColors } from '@/store/uiStore';

interface CountdownTimerProps {
  createdAt: Date;
  deadline: Date | null;
  disabled?: boolean;
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
          fontFamily: 'Inter-Bold',
          fontSize: 22,
          fontVariant: ['tabular-nums'],
          lineHeight: 24,
        }}
      >
        {String(value).padStart(2, '0')}
      </Text>
      <Text style={{ color: colors.text.secondary, fontFamily: 'Inter-Regular', fontSize: 11 }}>
        {unit}
      </Text>
    </View>
  );
}

export function CountdownTimer({
  createdAt,
  deadline,
  disabled = false,
  onUpdateDeadline,
}: CountdownTimerProps) {
  const colors = useThemeColors();
  const [now, setNow] = useState(() => Date.now());
  const [editing, setEditing] = useState(false);
  const [dateInput, setDateInput] = useState(() => formatDateInput(deadline));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), MINUTE_MS);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!editing) setDateInput(formatDateInput(deadline));
  }, [deadline, editing]);

  const timeLeft = useMemo(() => getTimeLeft(deadline, now), [deadline, now]);
  const elapsed = useMemo(() => getElapsed(createdAt, deadline, now), [createdAt, deadline, now]);

  async function saveDeadline() {
    const parsed = parseDateInput(dateInput);
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
    setEditing(false);
  }

  const caption = !deadline
    ? 'Choose a goal end date'
    : timeLeft.overdue
      ? 'End date reached'
      : `Day ${elapsed.elapsedDays} of ${elapsed.totalDays}`;

  return (
    <View style={{ marginBottom: 16 }}>
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
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 3 },
          shadowOpacity: 0.1,
          shadowRadius: 16,
          elevation: 2,
        }}
      >
        <Text
          style={{
            color: colors.text.accent,
            fontFamily: 'Inter-SemiBold',
            fontSize: 10.5,
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
          <Text style={{ color: colors.text.primary, fontFamily: 'Inter-SemiBold', fontSize: 14 }}>
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
          <Text style={{ color: colors.text.secondary, fontFamily: 'Inter-Regular', fontSize: 10.5 }}>
            {caption}
          </Text>
        </View>

        <Pressable
          accessibilityLabel="Edit goal end date"
          accessibilityRole="button"
          disabled={disabled}
          onPress={() => {
            setDateInput(formatDateInput(deadline));
            setError(null);
            setEditing((value) => !value);
          }}
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
              <Text style={{ color: colors.text.accent, fontFamily: 'Inter-Regular', fontSize: 16, letterSpacing: 1 }}>⋯</Text>
        </Pressable>
      </View>

      {editing ? (
        <View
          style={{
            alignSelf: 'flex-end',
            backgroundColor: colors.background.card,
            borderColor: colors.border.warm,
            borderRadius: 14,
            borderWidth: 1,
            gap: 10,
            marginTop: 8,
            maxWidth: 340,
            padding: 14,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.14,
            shadowRadius: 24,
            width: '100%',
          }}
        >
          <Typography variant="micro-label">END DATE</Typography>
          <DatePicker
            accessibilityLabel="Goal end date"
            allowClear
            disabled={saving}
            error={error}
            onChange={(value) => {
              setDateInput(value);
              if (error) setError(null);
            }}
            placeholder="Choose an end date"
            style={{ width: '100%' }}
            value={dateInput}
          />
          {error ? (
            <Typography variant="hint" style={{ color: colors.feedback.danger.text }}>
              {error}
            </Typography>
          ) : null}
          <View style={{ alignItems: 'center', flexDirection: 'row', justifyContent: 'flex-end', gap: 14 }}>
            <Pressable
              disabled={saving}
              onPress={() => {
                setEditing(false);
                setError(null);
              }}
            >
              <Typography variant="caption">Cancel</Typography>
            </Pressable>
            <Pressable accessibilityRole="button" disabled={saving} onPress={saveDeadline}>
              {saving ? (
                <ActivityIndicator color={colors.accent.primary} size="small" />
              ) : (
                <Typography variant="emphasis-sm" style={{ color: colors.text.accent }}>
                  Save date
                </Typography>
              )}
            </Pressable>
          </View>
        </View>
      ) : null}
    </View>
  );
}
