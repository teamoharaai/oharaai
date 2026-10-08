import assert from 'node:assert/strict';
import test from 'node:test';
import {
  calendarScopesForGoal,
  calendarScopesForMilestone,
  calendarScopesForTask,
  isGoalInViewerCalendar,
  isMilestoneInViewerCalendar,
  isTaskInViewerCalendar,
} from './scope.ts';

const viewerId = 'viewer';

test('Task Calendar scope includes viewer-created, viewer-assigned, and legacy owned work', () => {
  assert.equal(isTaskInViewerCalendar({ created_by: viewerId, assigned_to: 'teammate', user_id: 'owner' }, viewerId), true);
  assert.equal(isTaskInViewerCalendar({ created_by: 'teammate', assigned_to: viewerId, user_id: 'owner' }, viewerId), true);
  assert.equal(isTaskInViewerCalendar({ created_by: null, assigned_to: null, user_id: viewerId }, viewerId), true);
});

test('Task Calendar scope excludes merely visible shared or Guide work', () => {
  assert.equal(isTaskInViewerCalendar({ created_by: 'guide', assigned_to: 'owner', user_id: 'owner' }, viewerId), false);
  assert.equal(isTaskInViewerCalendar({ created_by: null, assigned_to: null, user_id: 'owner' }, viewerId), false);
});

test('Milestone and Goal Calendar scope follows explicit responsibility', () => {
  assert.equal(isMilestoneInViewerCalendar({ created_by: 'guide', responsible_user_id: viewerId, user_id: 'owner' }, viewerId), true);
  assert.equal(isMilestoneInViewerCalendar({ created_by: 'guide', responsible_user_id: 'owner', user_id: 'owner' }, viewerId), false);
  assert.equal(isGoalInViewerCalendar({ user_id: 'owner', project_lead_id: viewerId }, viewerId), true);
  assert.equal(isGoalInViewerCalendar({ user_id: 'owner', project_lead_id: 'guide' }, viewerId), false);
});

test('Projects filter relevance matrix keeps creator and assignment independent', () => {
  const arthur = 'arthur';
  const justin = 'justin';
  const maya = 'maya';
  const taskA = { created_by: arthur, assigned_to: justin, user_id: arthur };
  const taskB = { created_by: justin, assigned_to: arthur, user_id: justin };
  const taskC = { created_by: justin, assigned_to: maya, user_id: justin };
  assert.deepEqual([arthur, justin, maya].map((viewer) => isTaskInViewerCalendar(taskA, viewer)), [true, true, false]);
  assert.deepEqual([arthur, justin, maya].map((viewer) => isTaskInViewerCalendar(taskB, viewer)), [true, true, false]);
  assert.deepEqual([arthur, justin, maya].map((viewer) => isTaskInViewerCalendar(taskC, viewer)), [false, true, true]);

  const milestoneA = { created_by: arthur, responsible_user_id: maya, user_id: arthur };
  const milestoneB = { created_by: justin, responsible_user_id: arthur, user_id: justin };
  const milestoneC = { created_by: justin, responsible_user_id: justin, user_id: justin };
  assert.deepEqual([arthur, maya, justin].map((viewer) => isMilestoneInViewerCalendar(milestoneA, viewer)), [true, true, false]);
  assert.deepEqual([arthur, justin, maya].map((viewer) => isMilestoneInViewerCalendar(milestoneB, viewer)), [true, true, false]);
  assert.deepEqual([arthur, justin, maya].map((viewer) => isMilestoneInViewerCalendar(milestoneC, viewer)), [false, true, false]);
});

test('creator equals assignee or responsible still yields one relevance decision', () => {
  assert.equal(isTaskInViewerCalendar({ created_by: viewerId, assigned_to: viewerId, user_id: 'owner' }, viewerId), true);
  assert.equal(isMilestoneInViewerCalendar({ created_by: viewerId, responsible_user_id: viewerId, user_id: 'owner' }, viewerId), true);
});

test('Project creator-only work stays in Projects while assigned work also reaches the direct schedule', () => {
  assert.deepEqual(
    calendarScopesForTask({ created_by: viewerId, assigned_to: 'teammate', user_id: viewerId }, viewerId, 'project-1'),
    ['projects'],
  );
  assert.deepEqual(
    calendarScopesForTask({ created_by: 'teammate', assigned_to: viewerId, user_id: 'teammate' }, viewerId, 'project-1'),
    ['ohara', 'projects'],
  );
  assert.deepEqual(
    calendarScopesForMilestone({ created_by: viewerId, responsible_user_id: 'teammate', user_id: viewerId }, viewerId, 'project-1'),
    ['projects'],
  );
  assert.deepEqual(
    calendarScopesForMilestone({ created_by: 'teammate', responsible_user_id: viewerId, user_id: 'teammate' }, viewerId, 'project-1'),
    ['ohara', 'projects'],
  );
  assert.deepEqual(
    calendarScopesForGoal({ user_id: viewerId, project_lead_id: null }, viewerId, 'project-1'),
    ['ohara', 'projects'],
  );
});
