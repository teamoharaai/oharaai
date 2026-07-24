import assert from 'node:assert/strict';
import test from 'node:test';
import {
  assembleFriendsSnapshot,
  assembleFriendSearchResults,
  classifyFriendRpcError,
  FriendDataError,
  validateAddresseeId,
  validateUsernamePrefix,
  validateUuid,
} from '../lib/db/friends-core.ts';

const USER_ID = '00000000-0000-4000-8000-000000000001';
const FRIEND_A_ID = '00000000-0000-4000-8000-000000000002';
const FRIEND_B_ID = '00000000-0000-4000-8000-000000000003';
const FRIEND_C_ID = '00000000-0000-4000-8000-000000000004';

function profile(id, username, displayName) {
  return {
    id,
    username,
    display_name: displayName,
    avatar_url: null,
  };
}

function connection(
  id,
  requesterId,
  addresseeId,
  status,
  createdAt,
) {
  return {
    id,
    requester_id: requesterId,
    addressee_id: addresseeId,
    status,
    created_at: createdAt,
  };
}

test('snapshot maps one hydrated batch and applies deterministic ordering', () => {
  const snapshot = assembleFriendsSnapshot(
    USER_ID,
    [
      connection(
        'accepted-z',
        USER_ID,
        FRIEND_A_ID,
        'accepted',
        '2026-07-20T12:00:00.000Z',
      ),
      connection(
        'accepted-a',
        FRIEND_B_ID,
        USER_ID,
        'accepted',
        '2026-07-21T12:00:00.000Z',
      ),
      connection(
        'incoming-old',
        FRIEND_A_ID,
        USER_ID,
        'pending',
        '2026-07-22T12:00:00.000Z',
      ),
      connection(
        'incoming-new',
        FRIEND_C_ID,
        USER_ID,
        'pending',
        '2026-07-23T12:00:00.000Z',
      ),
      connection(
        'sent',
        USER_ID,
        FRIEND_B_ID,
        'pending',
        '2026-07-24T12:00:00.000Z',
      ),
      connection(
        'outsider',
        FRIEND_A_ID,
        FRIEND_B_ID,
        'accepted',
        '2026-07-24T13:00:00.000Z',
      ),
    ],
    [
      profile(FRIEND_A_ID, 'zoe', 'Zoe'),
      profile(FRIEND_B_ID, 'amy', 'Amy'),
      profile(FRIEND_C_ID, 'maya', 'Maya'),
    ],
  );

  assert.deepEqual(
    snapshot.friends.map((person) => person.username),
    ['amy', 'zoe'],
  );
  assert.equal(snapshot.friend_count, 2);
  assert.deepEqual(
    snapshot.incoming_requests.map((request) => request.id),
    ['incoming-new', 'incoming-old'],
  );
  assert.deepEqual(
    snapshot.sent_requests.map((request) => request.id),
    ['sent'],
  );
});

test('search annotates all five relationship states without reordering hits', () => {
  const results = assembleFriendSearchResults(
    USER_ID,
    [
      profile(FRIEND_A_ID, 'alpha', 'Alpha'),
      profile(FRIEND_B_ID, 'bravo', 'Bravo'),
      profile(FRIEND_C_ID, 'charlie', 'Charlie'),
      profile(USER_ID, 'self_user', 'Self'),
      profile(
        '00000000-0000-4000-8000-000000000005',
        'delta',
        'Delta',
      ),
    ],
    [
      connection(
        'out',
        USER_ID,
        FRIEND_A_ID,
        'pending',
        '2026-07-24T12:00:00.000Z',
      ),
      connection(
        'in',
        FRIEND_B_ID,
        USER_ID,
        'pending',
        '2026-07-24T12:00:00.000Z',
      ),
      connection(
        'friend',
        USER_ID,
        FRIEND_C_ID,
        'accepted',
        '2026-07-24T12:00:00.000Z',
      ),
    ],
  );

  assert.deepEqual(
    results.map((result) => result.relation),
    ['pending_out', 'pending_in', 'friends', 'self', 'none'],
  );
  assert.deepEqual(
    results.map((result) => result.username),
    ['alpha', 'bravo', 'charlie', 'self_user', 'delta'],
  );
});

test('request validation accepts canonical inputs and rejects malformed ones', () => {
  assert.equal(validateUuid(` ${FRIEND_A_ID} `, 'id'), FRIEND_A_ID);
  assert.equal(
    validateAddresseeId(FRIEND_A_ID, USER_ID),
    FRIEND_A_ID,
  );
  assert.equal(validateUsernamePrefix('  May_A  '), 'may_a');

  assert.throws(
    () => validateUuid('not-a-uuid', 'id'),
    (error) =>
      error instanceof FriendDataError
      && error.code === 'INVALID_INPUT',
  );
  assert.throws(
    () => validateAddresseeId(USER_ID, USER_ID),
    (error) =>
      error instanceof FriendDataError
      && error.code === 'INVALID_INPUT',
  );
  assert.throws(
    () => validateUsernamePrefix('ab'),
    (error) =>
      error instanceof FriendDataError
      && error.code === 'INVALID_INPUT',
  );
  assert.throws(
    () => validateUsernamePrefix('invalid-prefix'),
    (error) =>
      error instanceof FriendDataError
      && error.code === 'INVALID_INPUT',
  );
});

test('database failures map only from stable RPC tokens and SQLSTATEs', () => {
  assert.equal(
    classifyFriendRpcError({
      code: 'P0002',
      message: 'profile_not_found',
    }),
    'profile_not_found',
  );
  assert.equal(
    classifyFriendRpcError({
      code: 'P0001',
      message: 'friend_request_cooldown',
    }),
    'cooldown',
  );
  assert.equal(
    classifyFriendRpcError({
      code: '23505',
      message: 'duplicate key value violates unique constraint',
    }),
    'already_connected',
  );
  assert.equal(
    classifyFriendRpcError({
      code: 'XX000',
      message: 'sensitive database prose',
    }),
    null,
  );
});
