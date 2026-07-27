import { useMemo, useState } from 'react';
import {
  Pressable,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useThemeColors } from '@/store/uiStore';
import { Button } from './Button';
import { Modal } from './Modal';
import { Typography } from './Typography';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
const CALENDAR_CELL_COUNT = 42;

export interface DatePickerProps {
  accessibilityLabel?: string;
  allowClear?: boolean;
  clearLabel?: string;
  disabled?: boolean;
  error?: string | null;
  maximumDate?: string;
  minimumDate?: string;
  onBlur?: (value: string) => void;
  onChange: (value: string) => void;
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
  disabled = false,
  error = null,
  maximumDate,
  minimumDate,
  onBlur,
  onChange,
  placeholder = 'Choose a date',
  style,
  value,
}: DatePickerProps) {
  const colors = useThemeColors();
  const minimum = useMemo(() => parseCalendarDate(minimumDate), [minimumDate]);
  const maximum = useMemo(() => parseCalendarDate(maximumDate), [maximumDate]);
  const committed = useMemo(() => parseCalendarDate(value), [value]);
  const [visible, setVisible] = useState(false);
  const [draft, setDraft] = useState<Date>(() => initialSelection(value, minimum, maximum));
  const [visibleMonth, setVisibleMonth] = useState<Date>(() => {
    const selection = initialSelection(value, minimum, maximum);
    return new Date(selection.getFullYear(), selection.getMonth(), 1);
  });

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

  const canGoPrevious = canNavigateToMonth(visibleMonth, -1, minimum, maximum);
  const canGoNext = canNavigateToMonth(visibleMonth, 1, minimum, maximum);

  function openPicker() {
    if (disabled) return;
    const selection = initialSelection(value, minimum, maximum);
    setDraft(selection);
    setVisibleMonth(new Date(selection.getFullYear(), selection.getMonth(), 1));
    setVisible(true);
  }

  function cancel() {
    setVisible(false);
    onBlur?.(value);
  }

  function apply() {
    const nextValue = formatCalendarDate(draft);
    onChange(nextValue);
    setVisible(false);
    onBlur?.(nextValue);
  }

  function clear() {
    onChange('');
    setVisible(false);
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
                return (
                  <View key={isoDate} style={{ alignItems: 'center', width: `${100 / 7}%` }}>
                    <Pressable
                      accessibilityLabel={formatAccessibleDate(date)}
                      accessibilityRole="button"
                      accessibilityState={{ disabled: unavailable, selected }}
                      disabled={unavailable}
                      onPress={() => selectDate(date)}
                      style={({ pressed }) => ({
                        alignItems: 'center',
                        backgroundColor: selected ? colors.accent.primary : 'transparent',
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
