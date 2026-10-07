import { test } from 'node:test';
import assert from 'node:assert/strict';
import { milestoneCreateOperationId } from './milestone-operation-id.ts';

const UUID_V5 = /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

test('milestoneCreateOperationId is a valid, version-5 UUID', () => {
  const id = milestoneCreateOperationId('11111111-1111-4111-8111-111111111111', 0);
  assert.match(id, UUID_V5);
});

test('milestoneCreateOperationId is deterministic for the same (goalId, index)', () => {
  const goalId = '22222222-2222-4222-8222-222222222222';
  assert.equal(milestoneCreateOperationId(goalId, 3), milestoneCreateOperationId(goalId, 3));
});

test('milestoneCreateOperationId differs by index and by goalId', () => {
  const a = '33333333-3333-4333-8333-333333333333';
  const b = '44444444-4444-4444-8444-444444444444';
  const ids = [milestoneCreateOperationId(a, 0), milestoneCreateOperationId(a, 1), milestoneCreateOperationId(b, 0)];
  assert.equal(new Set(ids).size, 3);
});
