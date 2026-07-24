import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createFriendsStateController,
  createInitialFriendsState,
} from '../features/friends/state-core.ts';

const PERSON_A = {
  id: '00000000-0000-4000-8000-000000000002',
  username: 'alice',
  display_name: 'Alice',
  avatar_url: null,
};
const PERSON_B = {
  id: '00000000-0000-4000-8000-000000000003',
  username: 'bravo',
  display_name: 'Bravo',
  avatar_url: null,
};

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

function emptySnapshot(overrides = {}) {
  return {
    friends: [],
    friend_count: 0,
    incoming_requests: [],
    sent_requests: [],
    ...overrides,
  };
}

function createService(overrides = {}) {
  return {
    fetchSnapshot: async () => emptySnapshot(),
    search: async () => [],
    accept: async (id) => ({ id }),
    decline: async (id) => ({ id }),
    send: async () => ({ id: 'connection-real' }),
    ...overrides,
  };
}

function createHarness(service, options = {}) {
  let state = createInitialFriendsState();
  const adapter = {
    get: () => state,
    set: (update) => {
      const patch =
        typeof update === 'function' ? update(state) : update;
      state = { ...state, ...patch };
    },
  };
  const actions = createFriendsStateController(
    adapter,
    service,
    { debounceMs: 0, ...options },
  );
  state = { ...state, ...actions };
  return {
    actions,
    getState: () => state,
    setState: (patch) => {
      state = { ...state, ...patch };
    },
  };
}

function waitForTimers() {
  return new Promise((resolve) => setTimeout(resolve, 5));
}

test('concurrent row mutations preserve a successful accept when a decline rolls back', async () => {
  const acceptResult = deferred();
  const declineResult = deferred();
  const incomingA = {
    id: 'connection-a',
    created_at: '2026-07-24T12:00:00.000Z',
    from: PERSON_A,
  };
  const incomingB = {
    id: 'connection-b',
    created_at: '2026-07-24T11:00:00.000Z',
    from: PERSON_B,
  };
  const harness = createHarness(
    createService({
      fetchSnapshot: async () =>
        emptySnapshot({
          incoming_requests: [incomingA, incomingB],
        }),
      accept: () => acceptResult.promise,
      decline: () => declineResult.promise,
    }),
  );

  await harness.actions.hydrate();
  harness.setState({
    searchResults: [
      { ...PERSON_A, relation: 'pending_in' },
      { ...PERSON_B, relation: 'pending_in' },
    ],
  });

  const accepting = harness.actions.acceptRequest(incomingA.id);
  const declining = harness.actions.declineRequest(incomingB.id);

  assert.deepEqual(harness.getState().incomingRequests, []);
  assert.deepEqual(
    harness.getState().friends.map((person) => person.id),
    [PERSON_A.id],
  );
  assert.deepEqual(
    harness.getState().searchResults.map((result) => result.relation),
    ['friends', 'none'],
  );

  acceptResult.resolve({ id: incomingA.id });
  declineResult.reject(new Error('Decline failed'));
  await Promise.all([accepting, declining]);

  assert.deepEqual(
    harness.getState().friends.map((person) => person.id),
    [PERSON_A.id],
  );
  assert.equal(harness.getState().friendCount, 1);
  assert.deepEqual(
    harness.getState().incomingRequests.map((request) => request.id),
    [incomingB.id],
  );
  assert.deepEqual(
    harness.getState().searchResults.map((result) => result.relation),
    ['friends', 'pending_in'],
  );
  assert.equal(
    harness.getState().connectionMutations[incomingA.id].error,
    null,
  );
  assert.equal(
    harness.getState().connectionMutations[incomingB.id].error.message,
    'Decline failed',
  );
});

test('a refresh requested during hydration always performs a second snapshot request', async () => {
  const firstSnapshot = deferred();
  const refreshedSnapshot = deferred();
  let requestCount = 0;
  const harness = createHarness(
    createService({
      fetchSnapshot: () => {
        requestCount += 1;
        return requestCount === 1
          ? firstSnapshot.promise
          : refreshedSnapshot.promise;
      },
    }),
  );

  const hydration = harness.actions.hydrate();
  const refresh = harness.actions.refresh();
  assert.equal(requestCount, 1);
  assert.equal(harness.getState().isInitialLoading, true);
  assert.equal(harness.getState().isRefreshing, true);

  firstSnapshot.resolve(
    emptySnapshot({ friends: [PERSON_A], friend_count: 1 }),
  );
  await waitForTimers();
  assert.equal(requestCount, 2);
  assert.equal(harness.getState().isInitialLoading, false);
  assert.equal(harness.getState().isRefreshing, true);

  refreshedSnapshot.resolve(
    emptySnapshot({ friends: [PERSON_B], friend_count: 1 }),
  );
  await Promise.all([hydration, refresh]);

  assert.equal(harness.getState().hasHydrated, true);
  assert.equal(harness.getState().isRefreshing, false);
  assert.deepEqual(harness.getState().friends, [PERSON_B]);
});

test('initial hydration is single-flight across concurrent callers', async () => {
  const snapshot = deferred();
  let requestCount = 0;
  const harness = createHarness(
    createService({
      fetchSnapshot: () => {
        requestCount += 1;
        return snapshot.promise;
      },
    }),
  );

  const firstHydration = harness.actions.hydrate();
  const secondHydration = harness.actions.hydrate();
  assert.equal(requestCount, 1);
  assert.equal(firstHydration, secondHydration);

  snapshot.resolve(emptySnapshot());
  await Promise.all([firstHydration, secondHydration]);
  assert.equal(harness.getState().hasHydrated, true);
});

test('an already-handled response refreshes the row to its authoritative relationship', async () => {
  let snapshotCount = 0;
  const incoming = {
    id: 'connection-a',
    created_at: '2026-07-24T12:00:00.000Z',
    from: PERSON_A,
  };
  const alreadyHandled = Object.assign(
    new Error('Friend request has already been handled.'),
    {
      code: 'CONFLICT',
      details: { reason: 'already_handled' },
    },
  );
  const harness = createHarness(
    createService({
      fetchSnapshot: async () => {
        snapshotCount += 1;
        return snapshotCount === 1
          ? emptySnapshot({ incoming_requests: [incoming] })
          : emptySnapshot({
              friends: [PERSON_A],
              friend_count: 1,
            });
      },
      accept: async () => {
        throw alreadyHandled;
      },
    }),
  );

  await harness.actions.hydrate();
  harness.setState({
    searchResults: [{ ...PERSON_A, relation: 'pending_in' }],
  });
  await harness.actions.acceptRequest(incoming.id);

  assert.equal(snapshotCount, 2);
  assert.deepEqual(harness.getState().incomingRequests, []);
  assert.deepEqual(harness.getState().friends, [PERSON_A]);
  assert.equal(
    harness.getState().searchResults[0].relation,
    'friends',
  );
  assert.equal(
    harness.getState().connectionMutations[incoming.id].error.details
      .reason,
    'already_handled',
  );
});

test('an out-of-order search response cannot replace the newest query', async () => {
  const firstSearch = deferred();
  const secondSearch = deferred();
  const queries = [];
  const harness = createHarness(
    createService({
      search: (query) => {
        queries.push(query);
        return queries.length === 1
          ? firstSearch.promise
          : secondSearch.promise;
      },
    }),
  );

  harness.actions.setSearchQuery('  alice  ');
  await waitForTimers();
  harness.actions.setSearchQuery('alicia');
  await waitForTimers();

  secondSearch.resolve([{ ...PERSON_B, relation: 'none' }]);
  await waitForTimers();
  firstSearch.resolve([{ ...PERSON_A, relation: 'none' }]);
  await waitForTimers();

  assert.deepEqual(queries, ['alice', 'alicia']);
  assert.equal(harness.getState().searchQuery, 'alicia');
  assert.deepEqual(harness.getState().searchResults, [
    { ...PERSON_B, relation: 'none' },
  ]);
  assert.equal(harness.getState().isSearchLoading, false);
});

test('shortening a query clears results and invalidates an in-flight response', async () => {
  const searchResult = deferred();
  const harness = createHarness(
    createService({ search: () => searchResult.promise }),
  );

  harness.actions.setSearchQuery('alice');
  await waitForTimers();
  assert.equal(harness.getState().isSearchLoading, true);

  harness.actions.setSearchQuery('al');
  assert.equal(harness.getState().searchQuery, 'al');
  assert.deepEqual(harness.getState().searchResults, []);
  assert.equal(harness.getState().isSearchLoading, false);

  searchResult.resolve([{ ...PERSON_A, relation: 'none' }]);
  await waitForTimers();
  assert.deepEqual(harness.getState().searchResults, []);
});

test('send uses the authoritative connection ID and preserves pending-in on conflict', async () => {
  const fixedNow = new Date('2026-07-24T16:30:00.000Z');
  const successHarness = createHarness(
    createService({
      send: async () => ({ id: 'authoritative-connection-id' }),
    }),
    { now: () => fixedNow },
  );
  successHarness.setState({
    searchResults: [{ ...PERSON_A, relation: 'none' }],
  });

  await successHarness.actions.sendRequest(PERSON_A);
  await successHarness.actions.sendRequest(PERSON_A);
  assert.deepEqual(successHarness.getState().sentRequests, [
    {
      id: 'authoritative-connection-id',
      created_at: fixedNow.toISOString(),
      to: PERSON_A,
    },
  ]);
  assert.equal(
    successHarness.getState().searchResults[0].relation,
    'pending_out',
  );

  const pendingIncomingError = Object.assign(
    new Error('This person already sent you a request.'),
    {
      code: 'CONFLICT',
      details: { reason: 'pending_incoming' },
    },
  );
  const conflictHarness = createHarness(
    createService({
      send: async () => {
        throw pendingIncomingError;
      },
    }),
  );
  conflictHarness.setState({
    searchResults: [{ ...PERSON_B, relation: 'pending_in' }],
  });

  await conflictHarness.actions.sendRequest(PERSON_B);
  assert.deepEqual(conflictHarness.getState().sentRequests, []);
  assert.equal(
    conflictHarness.getState().searchResults[0].relation,
    'pending_in',
  );
  assert.equal(
    conflictHarness.getState().sendMutations[PERSON_B.id].error.details
      .reason,
    'pending_incoming',
  );
});

test('reset clears account-owned data and prevents old in-flight work from repopulating it', async () => {
  const pendingAccept = deferred();
  const incoming = {
    id: 'connection-a',
    created_at: '2026-07-24T12:00:00.000Z',
    from: PERSON_A,
  };
  const harness = createHarness(
    createService({
      fetchSnapshot: async () =>
        emptySnapshot({
          incoming_requests: [incoming],
          sent_requests: [
            {
              id: 'connection-sent',
              created_at: '2026-07-24T10:00:00.000Z',
              to: PERSON_B,
            },
          ],
        }),
      accept: () => pendingAccept.promise,
    }),
  );

  await harness.actions.hydrate();
  harness.setState({
    searchQuery: 'alice',
    searchResults: [{ ...PERSON_A, relation: 'pending_in' }],
  });
  const accepting = harness.actions.acceptRequest(incoming.id);

  harness.actions.reset();
  assert.deepEqual(
    {
      friends: harness.getState().friends,
      incoming: harness.getState().incomingRequests,
      sent: harness.getState().sentRequests,
      search: harness.getState().searchResults,
      query: harness.getState().searchQuery,
      hydrated: harness.getState().hasHydrated,
      connectionMutations: harness.getState().connectionMutations,
      sendMutations: harness.getState().sendMutations,
    },
    {
      friends: [],
      incoming: [],
      sent: [],
      search: [],
      query: '',
      hydrated: false,
      connectionMutations: {},
      sendMutations: {},
    },
  );

  pendingAccept.resolve({ id: incoming.id });
  await accepting;
  assert.deepEqual(harness.getState().friends, []);
  assert.deepEqual(harness.getState().incomingRequests, []);
});

test('search trims, caps at twenty characters, and skips short prefixes', async () => {
  const queries = [];
  const harness = createHarness(
    createService({
      search: async (query) => {
        queries.push(query);
        return [];
      },
    }),
  );

  harness.actions.setSearchQuery(' ab ');
  await waitForTimers();
  assert.deepEqual(queries, []);

  harness.actions.setSearchQuery('  abcdefghijklmnopqrstuvwxyz  ');
  await waitForTimers();
  assert.deepEqual(queries, ['abcdefghijklmnopqrst']);
  assert.equal(
    harness.getState().searchQuery,
    'abcdefghijklmnopqrst',
  );
});
