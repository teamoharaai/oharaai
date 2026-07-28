import assert from 'node:assert/strict';
import test from 'node:test';
import { parseConstellationGraphDTO } from './dto.ts';
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
