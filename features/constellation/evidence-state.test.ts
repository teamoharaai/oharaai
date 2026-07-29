import assert from 'node:assert/strict';
import test from 'node:test';
import {
  groupGoalEvidenceItems,
  hasEvidenceForEcho,
  INITIAL_ECHO_SEARCH_STATE,
  reduceConstellationEchoSearch,
  removeGoalEvidenceItem,
  replaceGoalEvidenceInGraph,
  upsertGoalEvidenceItem,
} from './evidence-state.ts';
import {
  constellationFixtureEvidenceLinks,
  constellationFixtureGraph,
} from './fixtures.ts';
import type {
  ConstellationGoalEvidenceItem,
  ConstellationGraphDTO,
} from './types.ts';

const GOAL_ID = 'fixture-goal-source';

function item(
  index: number,
  overrides: Partial<ConstellationGoalEvidenceItem> = {},
): ConstellationGoalEvidenceItem {
  const link = constellationFixtureEvidenceLinks[index];
  return {
    ...link,
    echo: {
      id: link.echoEntryId,
      title: `Echo ${index + 1}`,
      excerpt: `Evidence excerpt ${index + 1}.`,
      excerptTruncated: false,
      createdAt: link.createdAt,
    },
    ...overrides,
  };
}

function cloneGraph(): ConstellationGraphDTO {
  return JSON.parse(
    JSON.stringify(constellationFixtureGraph),
  ) as ConstellationGraphDTO;
}

test('duplicate Echo submission is recognized and upsert preserves one goal pair', () => {
  const first = item(0);
  const duplicate = {
    ...first,
    id: 'new-server-id-for-the-same-pair',
    brtCategory: 'thorn' as const,
  };

  assert.equal(hasEvidenceForEcho([first], first.echoEntryId), true);
  const reconciled = upsertGoalEvidenceItem([first], duplicate);
  assert.equal(reconciled.length, 1);
  assert.equal(reconciled[0].id, duplicate.id);
  assert.equal(reconciled[0].brtCategory, 'thorn');
});

test('uncategorized goal evidence remains visible as an unlinked entry', () => {
  const unlinked = item(0, { brtCategory: null });
  const grouped = groupGoalEvidenceItems([unlinked, item(1)]);
  assert.deepEqual(grouped.unlinked, [unlinked]);
  assert.equal(grouped.rose.length, 1);
});

test('category changes recompute virtual cluster nodes and counts from current links', () => {
  const graph = replaceGoalEvidenceInGraph(
    cloneGraph(),
    GOAL_ID,
    [item(0), item(1)],
  );
  const changedItems = [
    item(0),
    item(1, { brtCategory: 'thorn' }),
  ];
  const changed = replaceGoalEvidenceInGraph(
    graph,
    GOAL_ID,
    changedItems,
    0,
  );

  assert.deepEqual(
    changed.virtualBrtClusters.map((cluster) => [
      cluster.brtCategory,
      cluster.evidenceLinkCount,
    ]),
    [['bud', 1], ['rose', 0], ['thorn', 1]],
  );
  assert.deepEqual(
    changed.counts.virtualBrtClusters,
    { total: 3, bud: 1, rose: 1, thorn: 1 },
  );
  assert.equal(changed.counts.evidenceLinks, 2);
  assert.equal(
    changed.edges.filter(
      (edge) => edge.kind === 'goal_evidence_cluster',
    ).length,
    3,
  );
});

test('unlink optimistic rollback restores exact evidence and cluster counts', () => {
  const items = [item(0), item(1)];
  const before = replaceGoalEvidenceInGraph(
    cloneGraph(),
    GOAL_ID,
    items,
  );
  const beforeSerialized = JSON.stringify(before);
  const optimisticItems = removeGoalEvidenceItem(
    items,
    items[0].id,
  );
  const optimistic = replaceGoalEvidenceInGraph(
    before,
    GOAL_ID,
    optimisticItems,
    -1,
  );

  assert.equal(optimistic.counts.evidenceLinks, 1);
  assert.deepEqual(
    optimistic.virtualBrtClusters.map((cluster) => cluster.brtCategory),
    ['bud', 'rose', 'thorn'],
  );
  assert.equal(JSON.stringify(before), beforeSerialized);

  const rolledBack = replaceGoalEvidenceInGraph(
    optimistic,
    GOAL_ID,
    items,
    1,
  );
  assert.equal(JSON.stringify(rolledBack), beforeSerialized);
});

test('late Echo results cannot replace a newer goal or query search', () => {
  const first = reduceConstellationEchoSearch(
    INITIAL_ECHO_SEARCH_STATE,
    {
      type: 'started',
      goalId: 'goal-a',
      query: 'first',
      requestId: 1,
    },
  );
  const second = reduceConstellationEchoSearch(first, {
    type: 'started',
    goalId: 'goal-b',
    query: 'second',
    requestId: 2,
  });
  const stale = reduceConstellationEchoSearch(second, {
    type: 'succeeded',
    goalId: 'goal-a',
    query: 'first',
    requestId: 1,
    options: [{
      id: 'stale-echo',
      title: 'Stale',
      excerpt: 'Old result',
      excerptTruncated: false,
      createdAt: '2026-07-01T00:00:00.000Z',
      existingReference: null,
    }],
  });

  assert.equal(stale, second);
  assert.equal(stale.goalId, 'goal-b');
  assert.equal(stale.query, 'second');
  assert.deepEqual(stale.options, []);
});
