export type TaskCompletionMode = 'binary' | 'quantity';
export type TaskStatus = 'active' | 'complete' | 'archived';
export type TaskOccurrenceStatus = 'pending' | 'completed' | 'skipped' | 'missed' | 'cancelled';
export type TaskSource = 'user' | 'legacy_tracker' | 'legacy_action';
export type TaskOccurrenceSource = 'user' | 'schedule' | 'retroactive' | 'legacy_tracker' | 'legacy_action';
export type TaskRecurrenceKind = 'daily' | 'weekly';

/**
 * Cadence axis (design 003 / TD-016): the honest recurrence choice a person
 * makes. `none` = an ad-hoc Completion (no schedule), `daily` = every day,
 * `setdays` = pick weekday(s) (merges the retired Weekly + Custom chips).
 */
export type TaskCadence = 'none' | 'daily' | 'setdays';

export interface TaskSchedule {
  id: string;
  taskId: string;
  version: number;
  recurrenceKind: TaskRecurrenceKind;
  intervalCount: number;
  weekdays: number[];
  startDate: string;
  endDate: string | null;
  localTime: string | null;
  timezone: string;
  isActive: boolean;
  source: 'user' | 'legacy_tracker';
}

export interface TaskOccurrence {
  id: string;
  taskId: string;
  scheduleId: string | null;
  occurrenceKey: string;
  scheduledLocalDate: string | null;
  scheduledLocalTime: string | null;
  scheduleTimezone: string | null;
  scheduledAt: string | null;
  status: TaskOccurrenceStatus;
  actualQuantity: number | null;
  note: string | null;
  completedAt: string | null;
  skippedAt: string | null;
  source: TaskOccurrenceSource;
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: string;
  goalId: string;
  milestoneId: string | null;
  title: string;
  description: string | null;
  completionMode: TaskCompletionMode;
  targetQuantity: number | null;
  quantityUnit: string | null;
  status: TaskStatus;
  dueDate: string | null;
  source: TaskSource;
  legacyCurrentValue: number | null;
  legacyFrequency: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  archivedAt: string | null;
  schedules: TaskSchedule[];
  occurrences: TaskOccurrence[];
}

export interface TaskCreateInput {
  goalId: string;
  title: string;
  description?: string | null;
  completionMode: TaskCompletionMode;
  targetQuantity?: number | null;
  quantityUnit?: string | null;
  dueDate?: string | null;
  milestoneId?: string | null;
  idempotencyKey: string;
  schedule?: TaskScheduleInput | null;
}

export interface TaskScheduleInput {
  recurrenceKind: TaskRecurrenceKind;
  intervalCount?: number;
  weekdays?: number[];
  startDate?: string | null;
  endDate?: string | null;
  localTime?: string | null;
  timezone?: string | null;
}

export interface TaskUpdateInput {
  title: string;
  description?: string | null;
  completionMode: TaskCompletionMode;
  targetQuantity?: number | null;
  quantityUnit?: string | null;
  dueDate?: string | null;
  /** `HH:MM` time-of-day for a one-time Task's occurrence, or null to clear it. */
  dueTime?: string | null;
  milestoneId?: string | null;
}

export interface TaskSections {
  today: Array<{ task: Task; occurrence: TaskOccurrence }>;
  upcoming: Array<{ task: Task; occurrence: TaskOccurrence }>;
  anytime: Array<{ task: Task; occurrence: TaskOccurrence }>;
  completed: Array<{ task: Task; occurrence: TaskOccurrence }>;
}

export interface TaskMigrationComparison {
  goalId: string;
  legacy: { trackers: number; trackerLogs: number; actions: number };
  canonical: {
    trackerTasks: number;
    trackerOccurrences: number;
    actionTasks: number;
    actionOccurrences: number;
  };
  differences: string[];
}
