import assert from 'node:assert/strict';
import test from 'node:test';
import { constellationFixtureGraph } from './fixtures.ts';
import {
  addGoalLinkToGraph,
  removeGoalLinkFromGraph,
  replaceGoalLinkInGraph,
} from './goal-link-state.ts';
import type {
  ConstellationGoalLink,
  ConstellationGraphDTO,
  ConstellationGoalNodeDTO,
} from './types.ts';

function graphWithTwoGoals(): ConstellationGraphDTO {
  const first = constellationFixtureGraph.earnedNodes.find(
    (node): node is ConstellationGoalNodeDTO => node.kind === 'goal',
  );
  assert.ok(first);
  const secondId = 'fixture-goal-two';
  const second: ConstellationGoalNodeDTO = {
    ...first,
    id: secondId,
    selectionKey: `node:${secondId}`,
    label: 'Second goal',
    source: { ...first.source, id: secondId },
  };
  return {
    ...constellationFixtureGraph,
    earnedNodes: [...constellationFixtureGraph.earnedNodes, second],
  };
}

test('optimistic goal-link add, reconcile, note edit, and remove preserve unrelated graph data', () => {
  const graph = graphWithTwoGoals();
  const goals = graph.earnedNodes.filter(
    (node): node is ConstellationGoalNodeDTO => node.kind === 'goal',
  );
  const optimistic: ConstellationGoalLink = {
    id: 'optimistic-1',
    ownerId: 'optimistic',
    sourceGoalId: goals[0].id,
    targetGoalId: goals[1].id,
    note: 'Initial note.',
    createdAt: '2026-07-30T12:00:00.000Z',
    updatedAt: '2026-07-30T12:00:00.000Z',
  };
  const added = addGoalLinkToGraph(graph, optimistic);
  assert.notEqual(added, graph);
  assert.equal(graph.counts.goalLinks, 0);
  assert.equal(added.counts.goalLinks, 1);
  assert.equal(added.counts.edges, graph.counts.edges + 1);

  const authoritative = {
    ...optimistic,
    id: '00000000-0000-4000-8000-000000000099',
    ownerId: '00000000-0000-4000-8000-000000000001',
  };
  const reconciled = replaceGoalLinkInGraph(
    added,
    optimistic.id,
    authoritative,
  );
  const edge = reconciled.edges.find(
    (candidate) => candidate.kind === 'user_goal_link',
  );
  assert.equal(
    edge?.kind === 'user_goal_link' ? edge.linkId : null,
    authoritative.id,
  );

  const edited = replaceGoalLinkInGraph(
    reconciled,
    authoritative.id,
    { ...authoritative, note: 'Edited note.' },
  );
  const editedEdge = edited.edges.find(
    (candidate) => candidate.kind === 'user_goal_link',
  );
  assert.equal(
    editedEdge?.kind === 'user_goal_link' ? editedEdge.note : null,
    'Edited note.',
  );

  const removed = removeGoalLinkFromGraph(edited, authoritative.id);
  assert.equal(removed.counts.goalLinks, 0);
  assert.equal(removed.counts.edges, graph.counts.edges);
  assert.equal(
    removed.edges.some((candidate) => candidate.kind === 'user_goal_link'),
    false,
  );
  assert.deepEqual(removed.earnedNodes, graph.earnedNodes);
  assert.deepEqual(removed.annotations, graph.annotations);
});
