import assert from 'node:assert/strict';
import test from 'node:test';
import { isGoalInViewerCalendar, isMilestoneInViewerCalendar, isTaskInViewerCalendar } from './scope.ts';

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
