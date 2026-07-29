import assert from 'node:assert/strict';
import test from 'node:test';
import {
  CONSTELLATION_VIEW_BOX,
  calculateConstellationLayout,
  calculateSproutedLabelLayout,
  createConstellationLayoutSpec,
  moveConstellationNode,
} from './layout.ts';
import {
  CONSTELLATION_RENDERER_INITIAL_SELECTION,
  constellationRendererFixtureGraph,
  constellationRendererFixtureLayoutSpec,
} from './dev/renderer-fixture.dev.ts';

test('renderer fixture uses normalized coordinates and fills the stable viewBox deterministically', () => {
  const first = calculateConstellationLayout(
    constellationRendererFixtureGraph,
    constellationRendererFixtureLayoutSpec,
  );
  const second = calculateConstellationLayout(
    constellationRendererFixtureGraph,
    constellationRendererFixtureLayoutSpec,
  );

  assert.deepEqual(first.viewBox, { width: 1200, height: 760 });
  assert.deepEqual(first.viewBox, CONSTELLATION_VIEW_BOX);
  assert.deepEqual(first, second);
  assert.equal(first.nodes.length, constellationRendererFixtureGraph.nodes.length);
  assert.equal(first.edges.length, constellationRendererFixtureGraph.edges.length);
  assert.deepEqual(first.missingNodeSelectionKeys, []);
  assert.deepEqual(first.missingEdgeIds, []);
  assert.ok(first.nodes.every((node) => (
    node.normalized.x >= 0
    && node.normalized.x <= 1
    && node.normalized.y >= 0
    && node.normalized.y <= 1
  )));
});

test('real graph view models receive complete deterministic non-fixture geometry', () => {
  const firstSpec = createConstellationLayoutSpec(
    constellationRendererFixtureGraph,
  );
  const secondSpec = createConstellationLayoutSpec(
    constellationRendererFixtureGraph,
  );
  const layout = calculateConstellationLayout(
    constellationRendererFixtureGraph,
    firstSpec,
  );

  assert.deepEqual(firstSpec, secondSpec);
  assert.equal(
    Object.keys(firstSpec.nodePositions).length,
    constellationRendererFixtureGraph.nodes.length,
  );
  assert.deepEqual(layout.missingNodeSelectionKeys, []);
  assert.deepEqual(layout.missingEdgeIds, []);
});

test('goal satellites use parent-relative coordinates and follow goal movement', () => {
  const initialSpec = createConstellationLayoutSpec(
    constellationRendererFixtureGraph,
  );
  const initialLayout = calculateConstellationLayout(
    constellationRendererFixtureGraph,
    initialSpec,
  );
  const cluster = initialLayout.nodes.find(
    (node) => node.entityType === 'virtual_brt_cluster',
  );
  assert.ok(cluster);
  assert.equal(cluster.coordinateSpace, 'parent');
  assert.ok(cluster.parentSelectionKey);
  const parent = initialLayout.nodes.find(
    (node) => node.selectionKey === cluster.parentSelectionKey,
  );
  assert.ok(parent);
  const offset = {
    x: cluster.normalized.x - parent.normalized.x,
    y: cluster.normalized.y - parent.normalized.y,
  };

  const movedSpec = moveConstellationNode(
    constellationRendererFixtureGraph,
    initialSpec,
    parent.selectionKey,
    {
      x: parent.normalized.x + 0.04,
      y: parent.normalized.y + 0.03,
    },
  );
  const movedLayout = calculateConstellationLayout(
    constellationRendererFixtureGraph,
    movedSpec,
  );
  const movedParent = movedLayout.nodes.find(
    (node) => node.selectionKey === parent.selectionKey,
  );
  const movedCluster = movedLayout.nodes.find(
    (node) => node.selectionKey === cluster.selectionKey,
  );
  assert.ok(movedParent);
  assert.ok(movedCluster);
  assert.equal(
    Number((movedCluster.normalized.x - movedParent.normalized.x).toFixed(6)),
    Number(offset.x.toFixed(6)),
  );
  assert.equal(
    Number((movedCluster.normalized.y - movedParent.normalized.y).toFixed(6)),
    Number(offset.y.toFixed(6)),
  );
});

test('sprouted labels are calculated outside rendering and remain inside the viewBox', () => {
  const layout = calculateConstellationLayout(
    constellationRendererFixtureGraph,
    constellationRendererFixtureLayoutSpec,
  );
  const sprout = calculateSproutedLabelLayout(
    layout,
    CONSTELLATION_RENDERER_INITIAL_SELECTION,
  );

  assert.ok(sprout);
  assert.equal(sprout.selectionKey, CONSTELLATION_RENDERER_INITIAL_SELECTION);
  assert.ok(sprout.box.x >= 0);
  assert.ok(sprout.box.y >= 0);
  assert.ok(sprout.box.x + sprout.box.width <= layout.viewBox.width);
  assert.ok(sprout.box.y + sprout.box.height <= layout.viewBox.height);
});

test('invalid non-normalized fixture coordinates fail fast', () => {
  assert.throws(
    () => calculateConstellationLayout(
      constellationRendererFixtureGraph,
      {
        ...constellationRendererFixtureLayoutSpec,
        nodePositions: {
          ...constellationRendererFixtureLayoutSpec.nodePositions,
          [CONSTELLATION_RENDERER_INITIAL_SELECTION]: { x: 1.25, y: 0.5 },
        },
      },
    ),
    /must be normalized to 0–1/,
  );
});

test('virtual BRT summaries stay attached to a visible goal and preserve category counts', () => {
  const clusters = constellationRendererFixtureGraph.nodes.filter(
    (node) => node.entityType === 'virtual_brt_cluster',
  );

  assert.equal(clusters.length, 5);
  for (const cluster of clusters) {
    assert.equal(cluster.entityType, 'virtual_brt_cluster');
    assert.ok(cluster.node.entryCount > 0);
    assert.ok(constellationRendererFixtureGraph.nodes.some(
      (node) => (
        node.entityType === 'earned_node'
        && node.node.kind === 'goal'
        && node.id === cluster.node.goalNodeId
      ),
    ));
    assert.ok(constellationRendererFixtureGraph.edges.some(
      (edge) => (
        edge.kind === 'goal_evidence_cluster'
        && edge.to.id === cluster.id
        && edge.from.id === cluster.node.goalNodeId
      ),
    ));
  }
});

test('annotations remain visibly draft-coded fixture entities, not earned nodes', () => {
  const annotations = constellationRendererFixtureGraph.nodes.filter(
    (node) => node.entityType === 'annotation',
  );

  assert.deepEqual(
    annotations.map((node) => node.entityType === 'annotation'
      ? [node.node.kind, node.node.authorship, node.node.isDraft, node.node.status]
      : null),
    [
      ['projection', 'user', true, 'draft'],
      ['note', 'user', true, 'draft'],
    ],
  );
  assert.equal(constellationRendererFixtureGraph.counts.earnedNodes.total, 20);
});
