import assert from 'node:assert/strict';
import test from 'node:test';
import {
  adaptGraphDtoToViewModel,
  countEarnedNodes,
  filterGraphNodes,
  focusGraphViewModel,
  groupGoalEvidenceByBrt,
  resolveGraphSelection,
  selectConnectedNeighborhood,
  selectRenderEdges,
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
    ['brt:fixture-goal-source:bud', 'fixture-goal', 'fixture-season', 'goal-category:growth'],
  );
  assert.equal(neighborhood.edges.length, 3);
});

test('Focus mode renders only the selected one-hop neighborhood and preserves global counts', () => {
  const viewModel = adaptGraphDtoToViewModel(constellationFixtureGraph);
  const focused = focusGraphViewModel(viewModel, 'node:fixture-goal');

  assert.deepEqual(
    focused.nodes.map((node) => node.id).sort(),
    ['brt:fixture-goal-source:bud', 'fixture-goal', 'fixture-season', 'goal-category:growth'],
  );
  assert.equal(focused.edges.length, 3);
  assert.equal(focused.counts, viewModel.counts);
  assert.equal(focusGraphViewModel(viewModel, null), viewModel);
});

test('goal evidence groups by semantic lowercase BRT values and returns virtual display clusters', () => {
  const clusters = groupGoalEvidenceByBrt(
    constellationFixtureEvidenceLinks,
    new Map([['fixture-goal-source', 'fixture-goal']]),
  );

  assert.deepEqual(
    clusters.map((cluster) => [cluster.brtCategory, cluster.label, cluster.entryCount]),
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

test('URL selections resolve only against entities present in the owner DTO', () => {
  assert.equal(
    resolveGraphSelection(constellationFixtureGraph, 'node:fixture-goal'),
    'node:fixture-goal',
  );
  assert.equal(
    resolveGraphSelection(constellationFixtureGraph, 'node:unknown'),
    null,
  );
  assert.equal(
    resolveGraphSelection(constellationFixtureGraph, 'annotation:fixture-note'),
    'annotation:fixture-note',
  );
});

test('a valid URL-selected entity remains in the render budget', () => {
  const season = fixtureNodes().find(
    (node) => node.entityType === 'earned_node' && node.node.kind === 'season',
  )!;
  const goals = Array.from({ length: 40 }, (_, index) => ({
    entityType: 'earned_node' as const,
    id: 'selected-goal-' + index,
    selectionKey: 'node:selected-goal-' + index,
    node: {
      ...constellationFixtureGraph.earnedNodes[1],
      id: 'selected-goal-' + index,
      selectionKey: ('node:selected-goal-' + index) as `node:${string}`,
      label: 'Selected goal ' + index,
      visibilityScore: index,
    },
  }));
  const selected = selectRenderBudget(
    [season, ...goals],
    30,
    'node:selected-goal-0',
  );

  assert.equal(selected.length, 30);
  assert.ok(selected.some((node) => node.selectionKey === 'node:selected-goal-0'));
  assert.ok(selected.some((node) => (
    node.entityType === 'earned_node' && node.node.kind === 'season'
  )));
});

test('30-node graph rendering stays within the six-edge-per-node and 90-edge budgets', () => {
  const nodes = Array.from({ length: 30 }, (_, index) => ({
    entityType: 'earned_node' as const,
    id: `budget-node-${index}`,
    selectionKey: `node:budget-node-${index}`,
    node: {
      ...constellationFixtureGraph.earnedNodes[1],
      id: `budget-node-${index}`,
      selectionKey: `node:budget-node-${index}` as `node:${string}`,
      label: `Budget node ${index}`,
    },
  }));
  const edges = Array.from({ length: 120 }, (_, index) => {
    const from = index % 30;
    const to = (from + 1 + Math.floor(index / 30)) % 30;
    return {
      id: `budget-edge-${String(index).padStart(3, '0')}`,
      from: { entityType: 'earned_node' as const, id: `budget-node-${from}` },
      to: { entityType: 'earned_node' as const, id: `budget-node-${to}` },
      isPersisted: false,
      kind: 'goal_pattern' as const,
      valence: 'positive' as const,
      weight: 120 - index,
    };
  });
  const selected = selectRenderEdges(nodes, edges);
  const degree = new Map<string, number>();

  for (const edge of selected) {
    degree.set(edge.from.id, (degree.get(edge.from.id) ?? 0) + 1);
    degree.set(edge.to.id, (degree.get(edge.to.id) ?? 0) + 1);
  }

  assert.ok(selected.length <= 90);
  assert.ok([...degree.values()].every((count) => count <= 6));
  assert.deepEqual(selected, selectRenderEdges(nodes, edges));
});

test('derived hierarchy edges remain visible without consuming semantic edge degree', () => {
  const nodes = fixtureNodes();
  const goal = nodes.find(
    (node) => node.entityType === 'earned_node' && node.node.kind === 'goal',
  );
  const category = nodes.find(
    (node) => node.entityType === 'virtual_goal_category',
  );
  assert.ok(goal);
  assert.ok(category);

  const semanticEdges = Array.from({ length: 8 }, (_, index) => ({
    id: `semantic-${index}`,
    from: { entityType: 'earned_node' as const, id: goal.id },
    to: {
      entityType: 'earned_node' as const,
      id: constellationFixtureGraph.earnedNodes[0].id,
    },
    isPersisted: true,
    kind: 'goal_pattern' as const,
    valence: 'positive' as const,
    weight: 100 - index,
  }));
  const categoryEdge = constellationFixtureGraph.edges.find(
    (edge) => edge.kind === 'goal_category_membership',
  );
  assert.ok(categoryEdge);

  const selected = selectRenderEdges(
    nodes,
    [...semanticEdges, categoryEdge],
  );

  assert.ok(selected.some((edge) => edge.id === categoryEdge.id));
  assert.equal(
    selected.filter((edge) => edge.kind === 'goal_pattern').length,
    6,
  );
});

test('render budgeting never leaves a category hub without a visible related goal', () => {
  const dto: ConstellationGraphDTO = {
    ...constellationFixtureGraph,
    earnedNodes: [
      ...constellationFixtureGraph.earnedNodes,
      ...Array.from({ length: 30 }, (_, index) => ({
        ...constellationFixtureGraph.earnedNodes[1],
        id: `crowding-goal-${index}`,
        selectionKey: `node:crowding-goal-${index}` as `node:${string}`,
        label: `Crowding goal ${index}`,
        visibilityScore: 100 - index,
      })),
    ],
  };
  const graph = adaptGraphDtoToViewModel(dto, { renderBudget: 30 });

  assert.ok(graph.nodes.some(
    (node) => node.entityType === 'earned_node' && node.node.kind === 'goal',
  ));
  assert.equal(
    graph.nodes.filter((node) => node.entityType === 'virtual_goal_category').length,
    0,
  );
});
