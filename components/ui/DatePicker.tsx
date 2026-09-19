import { useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { OHARA_DEADLINE_AMBER_RGB } from '@/constants/colors';
import { useThemeColors } from '@/store/uiStore';
import { Button } from './Button';
import { Modal } from './Modal';
import { Typography } from './Typography';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
const CALENDAR_CELL_COUNT = 42;
const DEADLINE_RAMP_ALPHAS = [0.22, 0.42, 0.66, 0.9] as const;

/** One day's deadline load, keyed by `YYYY-MM-DD` in {@link DatePickerDensity}. */
export interface DatePickerDensityDay {
  count: number;
  byKind?: Record<string, number>;
}
/**
 * Optional density overlay for the calendar: `YYYY-MM-DD` → deadline load. Days
 * with a positive count get an amber background that ramps with how many
 * deadlines already fall there, so picking an end date can space work out
 * (Goal Detail Redesign Phase 4). Structurally matches `DeadlineDensity` from
 * `lib/db/deadlines`, but this component stays decoupled from that domain type.
 */
export type DatePickerDensity = Record<string, DatePickerDensityDay>;

/** Amber ramp for a day's deadline count against the visible month's max. */
function deadlineBackground(count: number, max: number): string {
  if (count <= 0 || max <= 0) return 'transparent';
  const level = Math.min(DEADLINE_RAMP_ALPHAS.length, Math.max(1, Math.ceil((count / max) * DEADLINE_RAMP_ALPHAS.length)));
  return `rgba(${OHARA_DEADLINE_AMBER_RGB},${DEADLINE_RAMP_ALPHAS[level - 1]})`;
}

/** "2 deadlines · 1 milestone, 1 task" for the focused day's density, or null. */
function describeDensity(day: DatePickerDensityDay | undefined): string | null {
  if (!day || day.count <= 0) return null;
  const plural = day.count === 1 ? 'deadline' : 'deadlines';
  const parts = Object.entries(day.byKind ?? {})
    .filter(([, value]) => value > 0)
    .map(([kind, value]) => `${value} ${kind}${value === 1 ? '' : 's'}`);
  return parts.length ? `${day.count} ${plural} · ${parts.join(', ')}` : `${day.count} ${plural}`;
}

export interface DatePickerProps {
  accessibilityLabel?: string;
  allowClear?: boolean;
  clearLabel?: string;
  /**
   * Renders the trigger as a bare calendar icon that reveals the `placeholder`
   * label on hover (web) and the chosen date once set. The calendar popup is
   * unchanged. Handy for optional dates tucked behind a "More options" reveal.
   */
  compact?: boolean;
  /**
   * Optional deadline density behind the calendar days (amber ramp). Feed it the
   * cross-goal `DeadlineDensity` so the user can see which days are already busy
   * while choosing an end date. Purely presentational — never blocks selection.
   */
  density?: DatePickerDensity;
  disabled?: boolean;
  error?: string | null;
  /** Hide the field trigger when another control owns opening the calendar. */
  hideTrigger?: boolean;
  maximumDate?: string;
  minimumDate?: string;
  onBlur?: (value: string) => void;
  onChange: (value: string) => void;
  onOpenChange?: (open: boolean) => void;
  /** Controls the calendar modal from an external trigger. */
  open?: boolean;
  placeholder?: string;
  style?: StyleProp<ViewStyle>;
  value: string;
}

function startOfDay(value: Date): Date {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

export function parseCalendarDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const match = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  const parsed = new Date(year, month, day);
  if (
    parsed.getFullYear() !== year
    || parsed.getMonth() !== month
    || parsed.getDate() !== day
  ) {
    return null;
  }
  return parsed;
}

export function formatCalendarDate(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDisplayDate(value: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(value);
}

function formatAccessibleDate(value: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    day: 'numeric',
    month: 'long',
    weekday: 'long',
    year: 'numeric',
  }).format(value);
}

function sameDay(left: Date | null, right: Date): boolean {
  return Boolean(
    left
    && left.getFullYear() === right.getFullYear()
    && left.getMonth() === right.getMonth()
    && left.getDate() === right.getDate(),
  );
}

function clampDate(value: Date, minimum: Date | null, maximum: Date | null): Date {
  if (minimum && value < minimum) return minimum;
  if (maximum && value > maximum) return maximum;
  return value;
}

function initialSelection(
  value: string,
  minimum: Date | null,
  maximum: Date | null,
): Date {
  const parsed = parseCalendarDate(value);
  const fallback = minimum ?? startOfDay(new Date());
  return clampDate(parsed ?? fallback, minimum, maximum);
}

function isUnavailable(value: Date, minimum: Date | null, maximum: Date | null): boolean {
  return Boolean((minimum && value < minimum) || (maximum && value > maximum));
}

function canNavigateToMonth(
  month: Date,
  direction: -1 | 1,
  minimum: Date | null,
  maximum: Date | null,
): boolean {
  const candidate = new Date(month.getFullYear(), month.getMonth() + direction, 1);
  const candidateEnd = new Date(candidate.getFullYear(), candidate.getMonth() + 1, 0);
  if (minimum && candidateEnd < minimum) return false;
  if (maximum && candidate > maximum) return false;
  return true;
}

export function DatePicker({
  accessibilityLabel = 'Date',
  allowClear = false,
  clearLabel = 'Clear date',
  compact = false,
  density,
  disabled = false,
  error = null,
  hideTrigger = false,
  maximumDate,
  minimumDate,
  onBlur,
  onChange,
  onOpenChange,
  open,
  placeholder = 'Choose a date',
  style,
  value,
}: DatePickerProps) {
  const colors = useThemeColors();
  const minimum = useMemo(() => parseCalendarDate(minimumDate), [minimumDate]);
  const maximum = useMemo(() => parseCalendarDate(maximumDate), [maximumDate]);
  const committed = useMemo(() => parseCalendarDate(value), [value]);
  const [internalOpen, setInternalOpen] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [draft, setDraft] = useState<Date>(() => initialSelection(value, minimum, maximum));
  const [visibleMonth, setVisibleMonth] = useState<Date>(() => {
    const selection = initialSelection(value, minimum, maximum);
    return new Date(selection.getFullYear(), selection.getMonth(), 1);
  });
  const visible = open ?? internalOpen;

  useEffect(() => {
    if (open !== true) return;
    const selection = initialSelection(value, minimum, maximum);
    setDraft(selection);
    setVisibleMonth(new Date(selection.getFullYear(), selection.getMonth(), 1));
  }, [maximum, minimum, open, value]);

  const days = useMemo(() => {
    const firstOfMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1);
    const firstCell = new Date(
      firstOfMonth.getFullYear(),
      firstOfMonth.getMonth(),
      1 - firstOfMonth.getDay(),
    );
    return Array.from({ length: CALENDAR_CELL_COUNT }, (_, index) =>
      new Date(firstCell.getFullYear(), firstCell.getMonth(), firstCell.getDate() + index));
  }, [visibleMonth]);

  // Ramp each day's amber fill against the busiest visible day, so intensity is
  // readable within the month on screen rather than washed out by a distant peak.
  const maxDensity = useMemo(() => {
    if (!density) return 0;
    let max = 0;
    for (const date of days) {
      const day = density[formatCalendarDate(date)];
      if (day && day.count > max) max = day.count;
    }
    return max;
  }, [days, density]);
  const draftDensityLabel = density ? describeDensity(density[formatCalendarDate(draft)]) : null;

  const canGoPrevious = canNavigateToMonth(visibleMonth, -1, minimum, maximum);
  const canGoNext = canNavigateToMonth(visibleMonth, 1, minimum, maximum);

  function setPickerOpen(next: boolean) {
    if (open === undefined) setInternalOpen(next);
    onOpenChange?.(next);
  }

  function openPicker() {
    if (disabled) return;
    const selection = initialSelection(value, minimum, maximum);
    setDraft(selection);
    setVisibleMonth(new Date(selection.getFullYear(), selection.getMonth(), 1));
    setPickerOpen(true);
  }

  function cancel() {
    setPickerOpen(false);
    onBlur?.(value);
  }

  function apply() {
    const nextValue = formatCalendarDate(draft);
    onChange(nextValue);
    setPickerOpen(false);
    onBlur?.(nextValue);
  }

  function clear() {
    onChange('');
    setPickerOpen(false);
    onBlur?.('');
  }

  function navigateMonth(direction: -1 | 1) {
    if (!canNavigateToMonth(visibleMonth, direction, minimum, maximum)) return;
    setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() + direction, 1));
  }

  function selectDate(date: Date) {
    if (isUnavailable(date, minimum, maximum)) return;
    setDraft(date);
    if (date.getMonth() !== visibleMonth.getMonth() || date.getFullYear() !== visibleMonth.getFullYear()) {
      setVisibleMonth(new Date(date.getFullYear(), date.getMonth(), 1));
    }
  }

  return (
    <>
      {!hideTrigger && compact ? (
        <Pressable
          accessibilityHint={error ?? 'Opens a calendar'}
          accessibilityLabel={accessibilityLabel}
          accessibilityRole="button"
          accessibilityState={{ disabled, expanded: visible }}
          disabled={disabled}
          onHoverIn={() => setHovered(true)}
          onHoverOut={() => setHovered(false)}
          onPress={openPicker}
          style={({ pressed }) => [
            {
              alignItems: 'center',
              alignSelf: 'flex-start',
              backgroundColor: colors.background.input,
              borderColor: error
                ? colors.feedback.danger.border
                : committed
                  ? colors.border.accent
                  : colors.border.input,
              borderRadius: 10,
              borderWidth: 1,
              flexDirection: 'row',
              gap: 8,
              minHeight: 40,
              opacity: disabled ? 0.5 : pressed ? 0.72 : 1,
              paddingHorizontal: 12,
              paddingVertical: 8,
            },
            style,
          ]}
        >
          <Ionicons
            color={committed ? colors.text.accent : colors.text.muted}
            name="calendar-outline"
            size={18}
          />
          {committed ? (
            <Typography numberOfLines={1} variant="meta" style={{ color: colors.text.primary }}>
              {formatDisplayDate(committed)}
            </Typography>
          ) : hovered ? (
            <Typography numberOfLines={1} variant="meta" style={{ color: colors.text.muted }}>
              {placeholder}
            </Typography>
          ) : null}
        </Pressable>
      ) : !hideTrigger ? (
        <Pressable
          accessibilityHint={error ?? 'Opens a calendar'}
          accessibilityLabel={accessibilityLabel}
          accessibilityRole="button"
          accessibilityState={{ disabled, expanded: visible }}
          disabled={disabled}
          onPress={openPicker}
          style={({ pressed }) => [
            {
              alignItems: 'center',
              backgroundColor: colors.background.input,
              borderColor: error ? colors.feedback.danger.border : colors.border.input,
              borderRadius: 12,
              borderWidth: 1,
              flexDirection: 'row',
              gap: 10,
              minHeight: 44,
              minWidth: 190,
              opacity: disabled ? 0.5 : pressed ? 0.72 : 1,
              paddingHorizontal: 14,
              paddingVertical: 10,
            },
            style,
          ]}
        >
          <Typography
            accessibilityElementsHidden
            importantForAccessibility="no"
            variant="body"
            style={{ color: colors.text.accent }}
          >
            ▦
          </Typography>
          <Typography
            numberOfLines={1}
            variant="meta"
            style={{ color: committed ? colors.text.primary : colors.text.muted, flex: 1 }}
          >
            {committed ? formatDisplayDate(committed) : placeholder}
          </Typography>
          <Typography
            accessibilityElementsHidden
            importantForAccessibility="no"
            variant="caption"
            style={{ color: colors.text.muted }}
          >
            ▾
          </Typography>
        </Pressable>
      ) : null}

      <Modal
        closeOnBackdropPress
        contentStyle={{ maxWidth: 392, padding: 16 }}
        onClose={cancel}
        showCloseButton={false}
        visible={visible}
      >
        <View style={{ gap: 16 }}>
          <View style={{ alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' }}>
            <Pressable
              accessibilityLabel="Previous month"
              accessibilityRole="button"
              accessibilityState={{ disabled: !canGoPrevious }}
              disabled={!canGoPrevious}
              hitSlop={4}
              onPress={() => navigateMonth(-1)}
              style={({ pressed }) => ({
                alignItems: 'center',
                borderColor: colors.border.warm,
                borderRadius: 12,
                borderWidth: 1,
                height: 44,
                justifyContent: 'center',
                opacity: !canGoPrevious ? 0.3 : pressed ? 0.64 : 1,
                width: 44,
              })}
            >
              <Typography variant="title">‹</Typography>
            </Pressable>

            <View style={{ alignItems: 'center' }}>
              <Typography variant="title">
                {new Intl.DateTimeFormat('en-US', { month: 'long' }).format(visibleMonth)}
              </Typography>
              <Typography variant="caption" style={{ color: colors.text.muted }}>
                {visibleMonth.getFullYear()}
              </Typography>
            </View>

            <Pressable
              accessibilityLabel="Next month"
              accessibilityRole="button"
              accessibilityState={{ disabled: !canGoNext }}
              disabled={!canGoNext}
              hitSlop={4}
              onPress={() => navigateMonth(1)}
              style={({ pressed }) => ({
                alignItems: 'center',
                borderColor: colors.border.warm,
                borderRadius: 12,
                borderWidth: 1,
                height: 44,
                justifyContent: 'center',
                opacity: !canGoNext ? 0.3 : pressed ? 0.64 : 1,
                width: 44,
              })}
            >
              <Typography variant="title">›</Typography>
            </Pressable>
          </View>

          <View>
            <View style={{ flexDirection: 'row' }}>
              {WEEKDAYS.map((weekday) => (
                <View key={weekday} style={{ alignItems: 'center', width: `${100 / 7}%` }}>
                  <Typography variant="micro-label" style={{ color: colors.text.muted }}>
                    {weekday.slice(0, 1)}
                  </Typography>
                </View>
              ))}
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 5 }}>
              {days.map((date) => {
                const isoDate = formatCalendarDate(date);
                const selected = sameDay(draft, date);
                const today = sameDay(startOfDay(new Date()), date);
                const outsideMonth = date.getMonth() !== visibleMonth.getMonth();
                const unavailable = isUnavailable(date, minimum, maximum);
                const dayDensity = density?.[isoDate];
                const densityCount = dayDensity?.count ?? 0;
                const densityFill = deadlineBackground(densityCount, maxDensity);
                return (
                  <View key={isoDate} style={{ alignItems: 'center', width: `${100 / 7}%` }}>
                    <Pressable
                      accessibilityLabel={
                        densityCount > 0
                          ? `${formatAccessibleDate(date)}, ${describeDensity(dayDensity)}`
                          : formatAccessibleDate(date)
                      }
                      accessibilityRole="button"
                      accessibilityState={{ disabled: unavailable, selected }}
                      disabled={unavailable}
                      onPress={() => selectDate(date)}
                      style={({ pressed }) => ({
                        alignItems: 'center',
                        backgroundColor: selected ? colors.accent.primary : densityFill,
                        borderColor: today && !selected ? colors.border.accent : 'transparent',
                        borderRadius: 12,
                        borderWidth: 1,
                        height: 44,
                        justifyContent: 'center',
                        opacity: unavailable ? 0.22 : outsideMonth ? 0.46 : pressed ? 0.6 : 1,
                        width: '100%',
                      })}
                    >
                      <Typography
                        variant="meta"
                        style={{ color: selected ? colors.text.onAccent : colors.text.primary }}
                      >
                        {date.getDate()}
                      </Typography>
                    </Pressable>
                  </View>
                );
              })}
            </View>
          </View>

          {density ? (
            <View style={{ alignItems: 'center', flexDirection: 'row', gap: 8 }}>
              <View
                style={{
                  backgroundColor: `rgba(${OHARA_DEADLINE_AMBER_RGB},0.66)`,
                  borderRadius: 3,
                  height: 12,
                  width: 12,
                }}
              />
              <Typography variant="caption" style={{ color: colors.text.muted, flex: 1 }}>
                {draftDensityLabel ?? 'Amber marks days that already have deadlines'}
              </Typography>
            </View>
          ) : null}

          <View
            style={{
              alignItems: 'center',
              borderTopColor: colors.border.warm,
              borderTopWidth: 1,
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: 10,
              justifyContent: allowClear ? 'space-between' : 'flex-end',
              paddingTop: 16,
            }}
          >
            {allowClear ? (
              <Button onPress={clear} size="compact" variant="ghost">
                {clearLabel}
              </Button>
            ) : null}
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Button onPress={cancel} size="compact" variant="secondary">
                Cancel
              </Button>
              <Button onPress={apply} size="compact">
                Apply
              </Button>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

export default DatePicker;
