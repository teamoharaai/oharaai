import assert from 'node:assert/strict';
import test from 'node:test';
import { adaptTasksToMomentum, type MomentumTaskRow } from './task-adapter.ts';
import { getMomentumWeek } from './time.ts';

const boundary = getMomentumWeek(new Date('2026-09-09T16:00:00.000Z'), 'America/New_York');
const baseTask: MomentumTaskRow = {
  id: 'task',
  title: 'Task',
  user_id: 'user',
  goal_id: 'goal',
  completion_mode: 'binary',
  target_quantity: null,
  status: 'active',
  due_date: null,
  source: 'user',
  legacy_tracker_id: null,
  legacy_action_log_id: null,
  legacy_current_value: null,
  legacy_frequency: null,
  legacy_tracker_type: null,
  legacy_status: null,
  created_at: '2026-09-07T13:00:00.000Z',
  task_schedules: [],
  task_occurrences: [],
};

test('weekly-count normalizes one weekly commitment without an early missed expectation or double count', () => {
  const weekly: MomentumTaskRow = { ...baseTask, completion_mode: 'quantity', target_quantity: 3,
    task_schedules: [{ id: 's', recurrence_kind: 'weekly_count', interval_count: 1, weekdays: [], is_active: true }],
    task_occurrences: [{ id: 'o', schedule_id: 's', scheduled_local_date: '2026-09-07',
      status: 'pending', actual_quantity: 2, completed_at: null, source: 'schedule',
      legacy_tracker_log_id: null, legacy_action_log_id: null, legacy_raw_value: null,
      created_at: '2026-09-07T13:00:00Z' }],
  };
  const adapt = (asOf: string, closed: boolean) => adaptTasksToMomentum([weekly], new Map([['goal', 'active']]), boundary, asOf, closed);
  const provisional = adapt('2026-09-09', false);
  assert.equal(provisional.trackers[0].expectedOccurrences, 0);
  assert.equal(provisional.trackers[0].targetValue, 3);
  assert.equal(provisional.trackers[0].frequency, 'weekly');
  assert.equal(provisional.actions.length, 0);
  assert.equal(adapt('2026-09-14', true).trackers[0].expectedOccurrences, 1);
  weekly.task_occurrences[0] = { ...weekly.task_occurrences[0], status: 'completed', actual_quantity: 3, completed_at: '2026-09-09T12:00:00Z' };
  const completed = adapt('2026-09-09', false);
  assert.equal(completed.trackers[0].expectedOccurrences, 1);
  assert.equal(completed.trackerLogs.length, 1);
  assert.equal(completed.trackerLogs[0].value, 3);
  assert.equal(completed.completedOccurrenceCount, 1);
});

test('keeps migrated Tracker evidence out of the action/task-completion channel', () => {
  const migrated: MomentumTaskRow = {
    ...baseTask,
    id: 'legacy-task',
    source: 'legacy_tracker',
    legacy_tracker_id: 'tracker',
    legacy_frequency: 'daily',
    legacy_tracker_type: 'habit',
    task_occurrences: [{
      id: 'legacy-occurrence', schedule_id: null, scheduled_local_date: null,
      status: 'completed', actual_quantity: 1, completed_at: '2026-09-08T13:00:00.000Z',
      source: 'legacy_tracker', legacy_tracker_log_id: 'tracker-log',
      legacy_action_log_id: null, legacy_raw_value: 1, created_at: '2026-09-08T13:00:00.000Z',
    }],
  };
  const result = adaptTasksToMomentum([migrated], new Map([['goal', 'active']]), boundary, '2026-09-09', false);
  assert.equal(result.actions.length, 0);
  assert.equal(result.trackerLogs.length, 1);
  assert.equal(result.trackerLogs[0].id, 'tracker-log');
  assert.equal(result.completedOccurrenceCount, 0);
});

test('normalizes native scheduled completion as Tracker-compatible routine evidence', () => {
  const recurring: MomentumTaskRow = {
    ...baseTask,
    id: 'recurring-task',
    task_schedules: [{ id: 'schedule', recurrence_kind: 'weekly', interval_count: 1, weekdays: [1, 3, 5], is_active: true }],
    task_occurrences: [
      {
        id: 'monday', schedule_id: 'schedule', scheduled_local_date: '2026-09-07', status: 'completed',
        actual_quantity: null, completed_at: '2026-09-07T13:00:00.000Z', source: 'schedule',
        legacy_tracker_log_id: null, legacy_action_log_id: null, legacy_raw_value: null,
        created_at: '2026-09-07T13:00:00.000Z',
      },
      {
        id: 'wednesday', schedule_id: 'schedule', scheduled_local_date: '2026-09-09', status: 'pending',
        actual_quantity: null, completed_at: null, source: 'schedule', legacy_tracker_log_id: null,
        legacy_action_log_id: null, legacy_raw_value: null, created_at: '2026-09-07T13:00:00.000Z',
      },
    ],
  };
  const result = adaptTasksToMomentum([recurring], new Map([['goal', 'active']]), boundary, '2026-09-09', false);
  assert.equal(result.actions.length, 0);
  assert.equal(result.trackers[0].expectedOccurrences, 1);
  assert.equal(result.trackerLogs.length, 1);
  assert.equal(result.completedOccurrenceCount, 1);
});

test('normalizes one-time and legacy action occurrences exactly once as action evidence', () => {
  const oneTime: MomentumTaskRow = {
    ...baseTask,
    id: 'one-time',
    task_occurrences: [{
      id: 'one-time-occurrence', schedule_id: null, scheduled_local_date: '2026-09-08',
      status: 'completed', actual_quantity: null, completed_at: '2026-09-08T13:00:00.000Z',
      source: 'user', legacy_tracker_log_id: null, legacy_action_log_id: null,
      legacy_raw_value: null, created_at: '2026-09-07T13:00:00.000Z',
    }],
  };
  const legacyAction: MomentumTaskRow = {
    ...oneTime,
    id: 'legacy-action-task',
    source: 'legacy_action',
    legacy_action_log_id: 'action-log',
    task_occurrences: [{
      ...oneTime.task_occurrences[0],
      id: 'legacy-action-occurrence',
      source: 'legacy_action',
      legacy_action_log_id: 'action-log',
    }],
  };
  const result = adaptTasksToMomentum(
    [oneTime, legacyAction], new Map([['goal', 'active']]), boundary, '2026-09-09', false,
  );
  assert.deepEqual(result.actions.map((action) => action.id).sort(), ['action-log', 'one-time-occurrence']);
  assert.equal(result.trackerLogs.length, 0);
  assert.equal(result.completedOccurrenceCount, 2);
});
