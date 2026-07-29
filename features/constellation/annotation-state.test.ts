import assert from 'node:assert/strict';
import test from 'node:test';
import {
  addActiveAnnotation,
  archiveActiveAnnotation,
  isPersistedAnnotationAnchorTarget,
  replaceActiveAnnotation,
  replaceOptimisticAnnotation,
} from './annotation-state.ts';
import { constellationFixtureGraph } from './fixtures.ts';
import type {
  ConstellationAnnotationDTO,
  ConstellationGraphDTO,
} from './types.ts';

function cloneGraph(): ConstellationGraphDTO {
  return JSON.parse(
    JSON.stringify(constellationFixtureGraph),
  ) as ConstellationGraphDTO;
}

function projection(id: string): ConstellationAnnotationDTO {
  return {
    id,
    selectionKey: `annotation:${id}`,
    kind: 'projection',
    status: 'draft',
    authorship: 'user',
    isDraft: true,
    label: 'A possible direction',
    body: 'Private draft context.',
    anchorEarnedNodeId: null,
    anchorGoalId: 'fixture-goal',
    createdAt: '2026-07-28T12:00:00.000Z',
    updatedAt: '2026-07-28T12:00:00.000Z',
    archivedAt: null,
  };
}

test('optimistic annotation creation changes only the draft domain and derived anchor', () => {
  const before = cloneGraph();
  const immutableSnapshot = cloneGraph();
  const optimistic = addActiveAnnotation(
    before,
    projection('optimistic-1'),
  );

  assert.deepEqual(before, immutableSnapshot);
  assert.equal(optimistic.annotations.length, before.annotations.length + 1);
  assert.equal(
    optimistic.counts.annotations.draft,
    before.counts.annotations.draft + 1,
  );
  assert.equal(
    optimistic.edges.some(
      (edge) => (
        edge.kind === 'annotation_anchor'
        && edge.from.id === 'optimistic-1'
      ),
    ),
    true,
  );
  assert.deepEqual(
    optimistic.counts.earnedNodes,
    before.counts.earnedNodes,
  );
  assert.deepEqual(optimistic.counts.source, before.counts.source);
  assert.equal(
    optimistic.earnedNodes[1].visibilityScore,
    before.earnedNodes[1].visibilityScore,
  );
});

test('authoritative create and edit replace exactly one optimistic draft', () => {
  const optimistic = addActiveAnnotation(
    cloneGraph(),
    projection('optimistic-2'),
  );
  const saved = projection('saved-annotation');
  const reconciled = replaceOptimisticAnnotation(
    optimistic,
    'optimistic-2',
    saved,
  );
  const edited: ConstellationAnnotationDTO = {
    ...saved,
    kind: 'note',
    label: 'Reframed note',
    body: null,
    anchorEarnedNodeId: null,
    anchorGoalId: null,
  };
  const updated = replaceActiveAnnotation(
    reconciled,
    saved.id,
    edited,
  );

  assert.equal(
    reconciled.annotations.some((item) => item.id === 'optimistic-2'),
    false,
  );
  assert.equal(
    reconciled.annotations.filter((item) => item.id === saved.id).length,
    1,
  );
  assert.equal(
    reconciled.counts.annotations.draft,
    optimistic.counts.annotations.draft,
  );
  assert.equal(
    updated.edges.some(
      (edge) => (
        edge.kind === 'annotation_anchor'
        && edge.from.id === saved.id
      ),
    ),
    false,
  );
  assert.equal(updated.annotations[0].kind, 'note');
  assert.equal(updated.annotations[0].body, null);
});

test('archive removes an annotation from the active graph without earned side effects', () => {
  const before = cloneGraph();
  const archived = archiveActiveAnnotation(before, 'fixture-note');

  assert.equal(archived.annotations.length, 0);
  assert.deepEqual(
    archived.counts.annotations,
    { draft: 0, archived: 1 },
  );
  assert.deepEqual(
    archived.counts.earnedNodes,
    before.counts.earnedNodes,
  );
  assert.deepEqual(archived.counts.source, before.counts.source);
  assert.equal(archived.earnedNodes.length, before.earnedNodes.length);
});

test('annotation anchors expose only UUID-backed earned nodes', () => {
  const fallbackSeason = constellationFixtureGraph.earnedNodes[0];
  const persistedGoal = {
    ...constellationFixtureGraph.earnedNodes[1],
    id: '8c1a5197-2976-4bba-910f-0365494087e5',
  };

  assert.equal(isPersistedAnnotationAnchorTarget(fallbackSeason), false);
  assert.equal(isPersistedAnnotationAnchorTarget(persistedGoal), true);
});

test('failed optimistic work can restore the exact immutable pre-save DTO', () => {
  const previous = cloneGraph();
  const previousSerialized = JSON.stringify(previous);
  const optimistic = addActiveAnnotation(
    previous,
    projection('optimistic-rollback'),
  );

  assert.notEqual(JSON.stringify(optimistic), previousSerialized);
  assert.equal(JSON.stringify(previous), previousSerialized);
  const rolledBack = previous;
  assert.equal(JSON.stringify(rolledBack), previousSerialized);
});
