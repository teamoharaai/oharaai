import type { TaskCompletionMode, TaskScheduleInput } from './types';

export function recordValue(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('JSON object required');
  return value as Record<string, unknown>;
}

export function requiredString(value: unknown, field: string, max = 500): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${field} is required`);
  const clean = value.replace(/\0/g, '').trim();
  if (clean.length > max) throw new Error(`${field} is too long`);
  return clean;
}

export function optionalString(value: unknown, field: string, max = 5000): string | null {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string') throw new Error(`${field} must be a string`);
  const clean = value.replace(/\0/g, '').trim();
  if (clean.length > max) throw new Error(`${field} is too long`);
  return clean || null;
}

export function optionalDate(value: unknown, field: string): string | null {
  const clean = optionalString(value, field, 10);
  if (clean && !/^\d{4}-\d{2}-\d{2}$/.test(clean)) throw new Error(`${field} must use YYYY-MM-DD`);
  return clean;
}

export function completionMode(value: unknown): TaskCompletionMode {
  if (value !== 'binary' && value !== 'quantity') throw new Error('completionMode must be binary or quantity');
  return value;
}

export function optionalNumber(value: unknown, field: string): number | null {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error(`${field} must be a finite number`);
  return value;
}

export function scheduleInput(value: unknown): TaskScheduleInput | null {
  if (value === undefined || value === null) return null;
  const input = recordValue(value);
  if (input.recurrenceKind !== 'daily' && input.recurrenceKind !== 'weekly') {
    throw new Error('schedule.recurrenceKind must be daily or weekly');
  }
  const intervalCount = input.intervalCount === undefined ? 1 : optionalNumber(input.intervalCount, 'schedule.intervalCount');
  if (!intervalCount || !Number.isInteger(intervalCount) || intervalCount < 1 || intervalCount > 52) {
    throw new Error('schedule.intervalCount must be an integer from 1 to 52');
  }
  const weekdays = input.weekdays === undefined ? [] : input.weekdays;
  if (!Array.isArray(weekdays) || weekdays.some((day) => !Number.isInteger(day) || day < 1 || day > 7)) {
    throw new Error('schedule.weekdays must contain ISO weekdays 1 through 7');
  }
  const uniqueWeekdays = [...new Set(weekdays as number[])].sort();
  if (input.recurrenceKind === 'weekly' && uniqueWeekdays.length === 0) {
    throw new Error('Weekly schedules require at least one weekday');
  }
  const localTime = optionalString(input.localTime, 'schedule.localTime', 8);
  if (localTime && !/^\d{2}:\d{2}(:\d{2})?$/.test(localTime)) {
    throw new Error('schedule.localTime must use HH:MM');
  }
  return {
    recurrenceKind: input.recurrenceKind,
    intervalCount,
    weekdays: uniqueWeekdays,
    startDate: optionalDate(input.startDate, 'schedule.startDate'),
    endDate: optionalDate(input.endDate, 'schedule.endDate'),
    localTime,
    timezone: optionalString(input.timezone, 'schedule.timezone', 100),
  };
}

export function validateQuantityConfiguration(
  mode: TaskCompletionMode,
  targetQuantity: number | null,
  quantityUnit: string | null,
) {
  if (mode === 'binary' && (targetQuantity !== null || quantityUnit !== null)) {
    throw new Error('Binary Tasks cannot have quantity configuration');
  }
  // The counter target + unit are optional (a bare counter just counts up); only
  // a provided target must be a positive number. Mirrors the relaxed DB CHECK and
  // create/update/log RPC guards (migration 056, Goal Detail Redesign Phase 2).
  if (mode === 'quantity' && targetQuantity !== null && (!Number.isFinite(targetQuantity) || targetQuantity <= 0)) {
    throw new Error('A Task target must be a positive number');
  }
}
