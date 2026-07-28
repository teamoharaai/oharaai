import assert from 'node:assert/strict';
import test from 'node:test';
import {
  adaptGraphDtoToViewModel,
  countEarnedNodes,
  filterGraphNodes,
  groupGoalEvidenceByBrt,
  selectConnectedNeighborhood,
  selectRenderBudget,
  stableVirtualBrtClusterId,
  validateGraphTopology,
} from './graph.ts';
import {
  constellationFixtureEvidenceLinks,
  constellationFixtureGraph,
} from './fixtures.ts';
import type {
  ConstellationGraphDTO,
  ConstellationGraphViewNode,
} from './types.ts';

function fixtureNodes(): readonly ConstellationGraphViewNode[] {
  return adaptGraphDtoToViewModel(constellationFixtureGraph, { renderBudget: 30 }).nodes;
}

test('empty graphs remain valid and have no connected neighborhood', () => {
  assert.deepEqual(validateGraphTopology([], []), {
    duplicateNodeIds: [],
    malformedEdges: [],
    isValid: true,
  });
  assert.equal(selectConnectedNeighborhood([], [], 'missing'), undefined);
});

test('topology reports duplicate node IDs and malformed edge endpoints', () => {
  const nodes = fixtureNodes();
  const malformedGraph = {
    ...constellationFixtureGraph,
    edges: [
      ...constellationFixtureGraph.edges,
      {
        id: 'malformed-edge',
        from: { entityType: 'earned_node', id: 'fixture-goal' },
        to: { entityType: 'earned_node', id: 'missing-node' },
        kind: 'goal_pattern',
        valence: 'positive',
        weight: 1,
        isPersisted: false,
      },
    ],
  } as ConstellationGraphDTO;
  const duplicate = { ...nodes[0], id: 'fixture-goal' };
  const validation = validateGraphTopology([...nodes, duplicate], malformedGraph.edges);

  assert.deepEqual(validation.duplicateNodeIds, ['fixture-goal']);
  assert.equal(validation.malformedEdges.length, 1);
  assert.equal(validation.malformedEdges[0].to.reason, 'missing_node');
  assert.equal(validation.isValid, false);
});

test('connected-neighborhood selection contains only the selected node and its direct graph neighbors', () => {
  const viewModel = adaptGraphDtoToViewModel(constellationFixtureGraph);
  const neighborhood = selectConnectedNeighborhood(viewModel.nodes, viewModel.edges, 'fixture-goal');

  assert.ok(neighborhood);
  assert.deepEqual(
    neighborhood.nodes.map((node) => node.id).sort(),
    ['brt:fixture-goal-source:bud', 'fixture-goal', 'fixture-season'],
  );
  assert.equal(neighborhood.edges.length, 2);
});

test('goal evidence groups by semantic lowercase BRT values and returns virtual display clusters', () => {
  const clusters = groupGoalEvidenceByBrt(
    constellationFixtureEvidenceLinks,
    new Map([['fixture-goal-source', 'fixture-goal']]),
  );

  assert.deepEqual(
    clusters.map((cluster) => [cluster.brtCategory, cluster.label, cluster.evidenceLinkCount]),
    [
      ['bud', 'Bud', 1],
      ['rose', 'Rose', 1],
    ],
  );
});

test('virtual BRT IDs are stable and semantic', () => {
  assert.equal(
    stableVirtualBrtClusterId('goal-1', 'thorn'),
    stableVirtualBrtClusterId('goal-1', 'thorn'),
  );
  assert.notEqual(
    stableVirtualBrtClusterId('goal-1', 'thorn'),
    stableVirtualBrtClusterId('goal-1', 'rose'),
  );
});

test('annotations remain out of earned-node counts and archived annotations are hidden by default', () => {
  const nodes = fixtureNodes();
  const earned = countEarnedNodes(nodes);

  assert.equal(earned.total, 2);
  assert.equal(earned.byKind.goal, 1);
  assert.equal(nodes.filter((node) => node.entityType === 'annotation').length, 1);

  const archivedAnnotation = {
    ...nodes.find((node) => node.entityType === 'annotation')!,
    node: {
      ...nodes.find((node) => node.entityType === 'annotation')!.node,
      status: 'archived' as const,
      archivedAt: '2026-07-05T00:00:00.000Z',
    },
  } as ConstellationGraphViewNode;
  const filtered = filterGraphNodes([...nodes, archivedAnnotation]);
  assert.equal(filtered.filter((node) => node.entityType === 'annotation').length, 1);
});

test('filtering and render-budget selection never mutate source data and cap the graph at 30 nodes', () => {
  const season = fixtureNodes().find((node) => node.entityType === 'earned_node' && node.node.kind === 'season')!;
  const goals = Array.from({ length: 40 }, (_, index) => ({
    entityType: 'earned_node' as const,
    id: 'goal-' + index,
    selectionKey: 'node:goal-' + index,
    node: {
      ...constellationFixtureGraph.earnedNodes[1],
      id: 'goal-' + index,
      selectionKey: ('node:goal-' + index) as `node:${string}`,
      label: 'Goal ' + index,
      visibilityScore: index,
      lastActivityAt: '2026-07-04T12:00:00.000Z',
    },
  }));
  const source = [season, ...goals];
  const sourceIds = source.map((node) => node.id);
  const filtered = filterGraphNodes(source, { earnedNodeKinds: ['goal', 'season'] });
  const selected = selectRenderBudget(filtered);

  assert.deepEqual(source.map((node) => node.id), sourceIds);
  assert.equal(selected.length, 30);
  assert.equal(selected[0].id, 'fixture-season');
  assert.ok(selected.some((node) => node.id === 'goal-39'));
});
