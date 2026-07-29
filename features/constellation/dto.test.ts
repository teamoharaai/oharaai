import assert from 'node:assert/strict';
import test from 'node:test';
import {
  parseConstellationBrtInspectorDTO,
  parseConstellationEchoSearchDTO,
  parseConstellationGoalEvidenceDTO,
  parseConstellationGraphDTO,
  parseConstellationLayoutDTO,
  parseConstellationReflectionInspectorDTO,
} from './dto.ts';
import { constellationFixtureGraph } from './fixtures.ts';

function cloneFixture(): Record<string, unknown> {
  return JSON.parse(JSON.stringify(constellationFixtureGraph)) as Record<string, unknown>;
}

test('live Constellation DTO validation accepts the real versioned contract', () => {
  assert.deepEqual(
    parseConstellationGraphDTO(cloneFixture()),
    constellationFixtureGraph,
  );
});

test('layout DTO validation enforces unique bounded canvas and parent coordinates', () => {
  const layout = {
    version: '1.0',
    positions: [
      {
        selectionKey: 'node:goal-id',
        coordinateSpace: 'canvas',
        x: 0.4,
        y: 0.6,
        updatedAt: '2026-07-29T12:00:00.000Z',
      },
      {
        selectionKey: 'brt:goal-id:bud',
        coordinateSpace: 'parent',
        x: -0.05,
        y: 0.1,
        updatedAt: '2026-07-29T12:00:00.000Z',
      },
    ],
  };
  assert.deepEqual(parseConstellationLayoutDTO(layout), layout);
  assert.equal(parseConstellationLayoutDTO({
    ...layout,
    positions: [layout.positions[0], layout.positions[0]],
  }), null);
  assert.equal(parseConstellationLayoutDTO({
    ...layout,
    positions: [{ ...layout.positions[0], x: 1.2 }],
  }), null);
});

test('Constellation DTO validation rejects fixture origins and malformed selection keys', () => {
  const fixtureOrigin = cloneFixture();
  fixtureOrigin.state = {
    ...(fixtureOrigin.state as Record<string, unknown>),
    dataOrigin: 'fixture',
  };
  assert.equal(parseConstellationGraphDTO(fixtureOrigin), null);

  const malformedSelection = cloneFixture();
  const earnedNodes = malformedSelection.earnedNodes as Record<string, unknown>[];
  earnedNodes[1].selectionKey = 'node:another-id';
  assert.equal(parseConstellationGraphDTO(malformedSelection), null);
});

test('season_only DTOs are valid but require the Season anchor', () => {
  // Access gate removed: the empty state is season_only, and it must still carry
  // exactly one Season node named in seasonNodeId.
  const seasonOnly = cloneFixture();
  const earnedNodes = seasonOnly.earnedNodes as Record<string, unknown>[];
  const season = earnedNodes.find((node) => node.kind === 'season');
  assert.ok(season);
  seasonOnly.state = {
    ...(seasonOnly.state as Record<string, unknown>),
    hasGraphData: false,
    renderState: 'season_only',
    seasonNodeId: season.id,
  };
  seasonOnly.earnedNodes = [season];
  seasonOnly.annotations = [];
  seasonOnly.virtualBrtClusters = [];
  seasonOnly.edges = [];

  assert.ok(parseConstellationGraphDTO(seasonOnly));

  // A graph with no Season anchor is rejected.
  seasonOnly.earnedNodes = [];
  assert.equal(parseConstellationGraphDTO(seasonOnly), null);
});

test('goal evidence and Echo search DTOs reject mismatched goal or Echo identities', () => {
  const goal = {
    id: 'goal-id',
    title: 'Owned goal',
    description: 'A live goal description.',
    status: 'active',
    deadline: null,
    project: null,
    vaultId: 'vault-id',
  };
  const item = {
    id: 'reference-id',
    ownerId: 'owner-id',
    echoEntryId: 'echo-id',
    goalId: 'goal-id',
    brtCategory: 'bud',
    note: null,
    createdAt: '2026-07-28T12:00:00.000Z',
    updatedAt: '2026-07-28T12:00:00.000Z',
    echo: {
      id: 'echo-id',
      title: 'Owned Echo',
      excerpt: 'A bounded excerpt.',
      excerptTruncated: false,
      createdAt: '2026-07-28T11:00:00.000Z',
    },
  };
  const connectedFields = {
    connectedEntryCount: 1,
    recentEntries: [{
      ...item.echo,
      brtCategory: 'bud',
      connectionSource: 'both',
    }],
  };
  assert.ok(parseConstellationGoalEvidenceDTO({
    goal,
    ...connectedFields,
    items: [item],
  }));
  assert.ok(parseConstellationGoalEvidenceDTO({
    goal,
    ...connectedFields,
    items: [{ ...item, brtCategory: null }],
  }));
  assert.equal(parseConstellationGoalEvidenceDTO({
    goal: { ...goal, id: 'another-goal' },
    ...connectedFields,
    items: [item],
  }), null);

  assert.ok(parseConstellationEchoSearchDTO({
    goalId: 'goal-id',
    query: 'bounded',
    options: [{
      ...item.echo,
      existingReference: {
        id: item.id,
        brtCategory: 'thorn',
      },
    }],
  }));
  assert.equal(parseConstellationEchoSearchDTO({
    goalId: 'goal-id',
    query: 'bounded',
    options: [{
      ...item.echo,
      existingReference: {
        id: item.id,
        brtCategory: 'B',
      },
    }],
  }), null);
  assert.ok(parseConstellationEchoSearchDTO({
    goalId: 'goal-id',
    query: 'bounded',
    options: [{
      ...item.echo,
      existingReference: {
        id: item.id,
        brtCategory: null,
      },
    }],
  }));
  assert.equal(parseConstellationGoalEvidenceDTO({
    goal,
    ...connectedFields,
    items: [{ ...item, note: 'n'.repeat(281) }],
  }), null);
  assert.equal(parseConstellationGoalEvidenceDTO({
    goal,
    connectedEntryCount: 4,
    recentEntries: Array.from(
      { length: 4 },
      () => connectedFields.recentEntries[0],
    ),
    items: [item],
  }), null);
  assert.equal(parseConstellationEchoSearchDTO({
    goalId: 'goal-id',
    query: 'q'.repeat(121),
    options: [],
  }), null);
  assert.equal(parseConstellationEchoSearchDTO({
    goalId: 'goal-id',
    query: 'bounded',
    options: [{
      ...item.echo,
      excerpt: 'e'.repeat(241),
      existingReference: null,
    }],
  }), null);
});

test('BRT inspector DTO validates category-scoped bounded entries', () => {
  const entry = {
    id: 'entry-id',
    title: 'A beginning',
    excerpt: 'A bounded excerpt.',
    excerptTruncated: false,
    createdAt: '2026-07-28T12:00:00.000Z',
    brtCategory: 'bud',
  };
  assert.ok(parseConstellationBrtInspectorDTO({
    goalId: 'goal-id',
    category: 'bud',
    entries: [entry],
  }));
  assert.equal(parseConstellationBrtInspectorDTO({
    goalId: 'goal-id',
    category: 'rose',
    entries: [entry],
  }), null);
});

test('Reflection inspector DTO accepts bounded owned evidence and rejects fake valence data', () => {
  const reflection = {
    nodeId: 'reflection-node',
    label: 'Creative autonomy',
    description: 'A validated live pattern.',
    candidateKey: 'creative autonomy',
    candidateType: 'theme',
    occurrences: 3,
    aggregatedScore: 6.5,
    firstSeenAt: '2026-07-01T12:00:00.000Z',
    lastSeenAt: '2026-07-28T12:00:00.000Z',
    dominantValence: 'mixed',
    valenceHistory: [{
      valence: 'positive',
      echoEntryId: 'echo-id',
      timestamp: '2026-07-28T12:00:00.000Z',
    }],
    evidence: [{
      id: 'echo-id',
      title: 'Owned Echo',
      excerpt: 'A bounded excerpt.',
      excerptTruncated: false,
      createdAt: '2026-07-28T12:00:00.000Z',
      valence: 'positive',
    }],
  };

  assert.ok(parseConstellationReflectionInspectorDTO(reflection));
  assert.equal(parseConstellationReflectionInspectorDTO({
    ...reflection,
    dominantValence: 'thorn',
  }), null);
  assert.equal(parseConstellationReflectionInspectorDTO({
    ...reflection,
    evidence: [{
      ...reflection.evidence[0],
      excerpt: 'x'.repeat(241),
    }],
  }), null);
});
