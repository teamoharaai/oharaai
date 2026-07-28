import assert from 'node:assert/strict';
import test from 'node:test';
import {
  parseConstellationEchoSearchDTO,
  parseConstellationGoalEvidenceDTO,
  parseConstellationGraphDTO,
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

test('locked DTOs expose counts but no owner graph entities', () => {
  const locked = cloneFixture();
  locked.state = {
    ...(locked.state as Record<string, unknown>),
    accessEligible: false,
    renderState: 'locked',
    seasonNodeId: null,
  };
  locked.earnedNodes = [];
  locked.annotations = [];
  locked.virtualBrtClusters = [];
  locked.edges = [];

  assert.ok(parseConstellationGraphDTO(locked));

  locked.annotations = constellationFixtureGraph.annotations;
  assert.equal(parseConstellationGraphDTO(locked), null);
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
  assert.ok(parseConstellationGoalEvidenceDTO({
    goal,
    items: [item],
  }));
  assert.equal(parseConstellationGoalEvidenceDTO({
    goal: { ...goal, id: 'another-goal' },
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
  assert.equal(parseConstellationGoalEvidenceDTO({
    goal,
    items: [{ ...item, note: 'n'.repeat(281) }],
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
