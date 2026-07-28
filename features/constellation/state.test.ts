import assert from 'node:assert/strict';
import test from 'node:test';
import { constellationFixtureGraph } from './fixtures.ts';
import {
  INITIAL_CONSTELLATION_CLIENT_STATE,
  reduceConstellationClientState,
  shouldClearConstellationSelection,
} from './state.ts';

test('selection cleanup waits for optimistic annotation mutations to settle', () => {
  assert.equal(shouldClearConstellationSelection({
    hasDto: true,
    hasSelectionParam: true,
    isMutationSaving: true,
    selectedKey: null,
  }), false);
  assert.equal(shouldClearConstellationSelection({
    hasDto: true,
    hasSelectionParam: true,
    isMutationSaving: false,
    selectedKey: null,
  }), true);
  assert.equal(shouldClearConstellationSelection({
    hasDto: true,
    hasSelectionParam: true,
    isMutationSaving: false,
    selectedKey: 'annotation:owned-draft',
  }), false);
});

test('first-load failures become retryable errors instead of empty graph states', () => {
  const failed = reduceConstellationClientState(
    INITIAL_CONSTELLATION_CLIENT_STATE,
    {
      type: 'request_failed',
      error: 'Temporary failure.',
      retryable: true,
    },
  );

  assert.equal(failed.status, 'error');
  assert.equal(failed.dto, null);
  assert.equal(failed.retryable, true);
});

test('refresh retains the last successful real DTO and surfaces a stale-data warning', () => {
  const ready = reduceConstellationClientState(
    INITIAL_CONSTELLATION_CLIENT_STATE,
    {
      type: 'request_succeeded',
      dto: constellationFixtureGraph,
    },
  );
  const refreshing = reduceConstellationClientState(
    ready,
    { type: 'request_started' },
  );
  const failedRefresh = reduceConstellationClientState(
    refreshing,
    {
      type: 'request_failed',
      error: 'Refresh failed.',
      retryable: true,
    },
  );

  assert.equal(refreshing.status, 'ready');
  assert.equal(refreshing.isRefreshing, true);
  assert.equal(refreshing.dto, constellationFixtureGraph);
  assert.equal(failedRefresh.status, 'ready');
  assert.equal(failedRefresh.isRefreshing, false);
  assert.equal(failedRefresh.dto, constellationFixtureGraph);
  assert.equal(failedRefresh.refreshError, 'Refresh failed.');
});

test('non-retryable refresh failures discard stale owner data', () => {
  const ready = reduceConstellationClientState(
    INITIAL_CONSTELLATION_CLIENT_STATE,
    {
      type: 'request_succeeded',
      dto: constellationFixtureGraph,
    },
  );
  const failedRefresh = reduceConstellationClientState(
    ready,
    {
      type: 'request_failed',
      error: 'Access is no longer available.',
      retryable: false,
    },
  );

  assert.equal(failedRefresh.status, 'error');
  assert.equal(failedRefresh.dto, null);
  assert.equal(failedRefresh.retryable, false);
});
