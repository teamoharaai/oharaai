import assert from 'node:assert/strict';
import test from 'node:test';
import type {
  CirclePostRow,
  CirclesAuthor,
  FeedRow,
  GoalInviteRow,
  ProfileRow,
} from './circles-core.ts';
import {
  buildAuthorMap,
  CircleDataError,
  classifyPgError,
  mapAuthor,
  mapFeedRow,
  mapGoalSummary,
  mapPostCore,
  mapSentInvite,
  parseCreatePostInput,
  parseInviteeIds,
  parsePublicGoalId,
  validateCommentBody,
  validateInviteResponse,
  validatePostBody,
  validateUuid,
} from './circles-core.ts';

// A pinned, valid v4 UUID and a couple of distinct ids for author hydration.
const UUID_A = '00000000-0000-4000-8000-00000000000a';
const UUID_B = '00000000-0000-4000-8000-00000000000b';
const POST_ID = '11111111-1111-4111-8111-111111111111';

function profile(overrides: Partial<ProfileRow> = {}): ProfileRow {
  return {
    id: UUID_A,
    username: 'ariel',
    display_name: 'Ariel Rivers',
    avatar_url: 'https://cdn.example/a.png',
    ...overrides,
  };
}

function feedRow(overrides: Partial<FeedRow> = {}): FeedRow {
  return {
    id: POST_ID,
    author_id: UUID_A,
    post_kind: 'reflection',
    body: 'Evenings feel lighter',
    image_path: null as unknown as string,
    link_kind: null as unknown as string,
    link_ref_id: null as unknown as string,
    link_title: null as unknown as string,
    link_description: null as unknown as string,
    link_category: null as unknown as string,
    created_at: '2026-09-17T12:00:00.000Z',
    encouragement_count: 0,
    comment_count: 0,
    encouraged_by_me: false,
    saved_by_me: false,
    ...overrides,
  };
}

function postRow(overrides: Partial<CirclePostRow> = {}): CirclePostRow {
  return {
    id: POST_ID,
    author_id: UUID_A,
    body: 'A saved post',
    post_kind: 'milestone',
    image_path: null,
    link_kind: null,
    link_ref_id: null,
    link_title: null,
    link_description: null,
    link_category: null,
    created_at: '2026-09-17T12:00:00.000Z',
    updated_at: '2026-09-17T12:00:00.000Z',
    deleted_at: null,
    ...overrides,
  };
}

function inviteRow(overrides: Partial<GoalInviteRow> = {}): GoalInviteRow {
  return {
    id: '22222222-2222-4222-8222-222222222222',
    goal_id: '33333333-3333-4333-8333-333333333333',
    owner_id: UUID_A,
    invitee_id: UUID_B,
    status: 'pending',
    created_at: '2026-09-17T12:00:00.000Z',
    responded_at: null,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// classifyPgError — the SQLSTATE → domain-code table
// ---------------------------------------------------------------------------

test('classifyPgError maps the deliberately-surfaced SQLSTATEs', () => {
  assert.equal(classifyPgError({ code: '42501' }), 'FORBIDDEN');
  assert.equal(classifyPgError({ code: 'P0002' }), 'NOT_FOUND');
  assert.equal(classifyPgError({ code: '22023' }), 'INVALID_INPUT');
  assert.equal(classifyPgError({ code: '23505' }), 'CONFLICT');
});

test('classifyPgError returns null for unknown / missing codes (route turns it into a 500)', () => {
  assert.equal(classifyPgError({ code: '23503' }), null);
  assert.equal(classifyPgError({ code: undefined }), null);
  assert.equal(classifyPgError(null), null);
  assert.equal(classifyPgError(undefined), null);
});

// ---------------------------------------------------------------------------
// Author mappers
// ---------------------------------------------------------------------------

test('mapAuthor snake→camel with null-safe display name and avatar', () => {
  assert.deepEqual(mapAuthor(profile()), {
    id: UUID_A,
    username: 'ariel',
    displayName: 'Ariel Rivers',
    avatarUrl: 'https://cdn.example/a.png',
  });

  // A profile missing a display name / avatar degrades to '' / null.
  const bare = mapAuthor(
    profile({ display_name: null as unknown as string, avatar_url: null as unknown as string }),
  );
  assert.equal(bare.displayName, '');
  assert.equal(bare.avatarUrl, null);
});

test('buildAuthorMap keys profiles by id', () => {
  const map = buildAuthorMap([profile(), profile({ id: UUID_B, username: 'bee' })]);
  assert.equal(map.size, 2);
  assert.equal(map.get(UUID_B)?.username, 'bee');
  assert.equal(map.get('missing'), undefined);
});

// ---------------------------------------------------------------------------
// Feed / post-core mappers
// ---------------------------------------------------------------------------

test('mapFeedRow hydrates the author when present and coerces counts/flags', () => {
  const authors = buildAuthorMap([profile()]);
  const post = mapFeedRow(
    feedRow({
      encouragement_count: 3,
      comment_count: 2,
      encouraged_by_me: true,
      saved_by_me: true,
    }),
    authors,
  );
  assert.equal(post.id, POST_ID);
  assert.equal(post.authorId, UUID_A);
  assert.equal(post.postKind, 'reflection');
  assert.equal(post.author?.displayName, 'Ariel Rivers');
  assert.equal(post.encouragementCount, 3);
  assert.equal(post.commentCount, 2);
  assert.equal(post.encouragedByMe, true);
  assert.equal(post.savedByMe, true);
  assert.equal(post.link, null);
  assert.equal(post.imagePath, null);
});

test('mapFeedRow leaves author null when the author is no longer a friend', () => {
  const post = mapFeedRow(feedRow(), new Map());
  assert.equal(post.author, null);
});

test('mapFeedRow builds the link snapshot only when kind, ref, and title are all present', () => {
  const authors = buildAuthorMap([profile()]);
  const full = mapFeedRow(
    feedRow({
      link_kind: 'reflection',
      link_ref_id: UUID_B,
      link_title: 'Rest counts',
      link_description: 'On slower weeks',
      link_category: 'health',
    }),
    authors,
  );
  assert.deepEqual(full.link, {
    kind: 'reflection',
    refId: UUID_B,
    title: 'Rest counts',
    description: 'On slower weeks',
    category: 'health',
  });

  // A partial link (title stripped, e.g. an unlinked/private ref) collapses to null.
  const partial = mapFeedRow(
    feedRow({ link_kind: 'reflection', link_ref_id: UUID_B, link_title: null as unknown as string }),
    authors,
  );
  assert.equal(partial.link, null);
});

test('mapPostCore is the feed mapper without the interaction counts', () => {
  const authors = buildAuthorMap([profile()]);
  const core = mapPostCore(
    postRow({ link_kind: 'goal', link_ref_id: UUID_B, link_title: 'Run a 5K', link_category: 'health' }),
    authors,
  );
  assert.equal(core.id, POST_ID);
  assert.equal(core.postKind, 'milestone');
  assert.equal(core.author?.username, 'ariel');
  assert.deepEqual(core.link, {
    kind: 'goal',
    refId: UUID_B,
    title: 'Run a 5K',
    description: null,
    category: 'health',
  });
  // Interaction counts are intentionally absent from the core shape.
  assert.equal((core as unknown as Record<string, unknown>).encouragementCount, undefined);
});

// ---------------------------------------------------------------------------
// mapGoalSummary — the CD-004 whitelist
// ---------------------------------------------------------------------------

test('mapGoalSummary returns the whitelisted shape with milestones title+done only', () => {
  const authors = buildAuthorMap([profile()]);
  const summary = mapGoalSummary(
    {
      id: 'goal-1',
      owner_id: UUID_A,
      title: 'Run a 5K',
      category: 'health',
      status: 'active',
      access: 'invited',
      milestones: [
        { title: 'Run 1 mile', done: true, secret: 'PRIVATE' },
        { title: 'Finish the race', done: false },
      ],
      weekly_task: { done: 2, target: 5 },
    },
    authors,
  );
  assert.ok(summary);
  assert.equal(summary!.access, 'invited');
  assert.equal(summary!.owner?.displayName, 'Ariel Rivers');
  assert.deepEqual(summary!.milestones, [
    { title: 'Run 1 mile', done: true },
    { title: 'Finish the race', done: false },
  ]);
  assert.deepEqual(summary!.weeklyTask, { done: 2, target: 5 });
});

test('mapGoalSummary passes through weekly_task: null (SQL emits null when target is 0)', () => {
  const summary = mapGoalSummary({
    id: 'goal-1',
    owner_id: UUID_A,
    title: 'Sleep early',
    category: 'health',
    status: 'active',
    access: 'owner',
    milestones: [],
    weekly_task: null,
  });
  assert.ok(summary);
  assert.equal(summary!.weeklyTask, null);
  assert.deepEqual(summary!.milestones, []);
});

test('mapGoalSummary defaults access to invited and coerces missing scalars', () => {
  const summary = mapGoalSummary({ id: 'g', owner_id: UUID_A });
  assert.ok(summary);
  assert.equal(summary!.access, 'invited');
  assert.equal(summary!.title, '');
  assert.equal(summary!.status, '');
  assert.deepEqual(summary!.milestones, []);
  assert.equal(summary!.weeklyTask, null);
});

test('mapGoalSummary returns null for non-object input', () => {
  assert.equal(mapGoalSummary(null), null);
  assert.equal(mapGoalSummary('nope'), null);
  assert.equal(mapGoalSummary(42), null);
});

// ---------------------------------------------------------------------------
// mapSentInvite — CD-014 / CD-018 status folding
// ---------------------------------------------------------------------------

test('mapSentInvite folds declined into pending and keeps accepted (CD-014/CD-018)', () => {
  const authors = buildAuthorMap([profile({ id: UUID_B, username: 'bee' })]);
  assert.equal(mapSentInvite(inviteRow({ status: 'pending' }), authors)?.status, 'pending');
  assert.equal(mapSentInvite(inviteRow({ status: 'declined' }), authors)?.status, 'pending');
  assert.equal(mapSentInvite(inviteRow({ status: 'accepted' }), authors)?.status, 'accepted');
});

test('mapSentInvite drops withdrawn and unexpected statuses (returns null)', () => {
  const authors = buildAuthorMap([]);
  assert.equal(mapSentInvite(inviteRow({ status: 'withdrawn' }), authors), null);
  assert.equal(mapSentInvite(inviteRow({ status: 'garbage' }), authors), null);
});

test('mapSentInvite hydrates the invitee and passes respondedAt through', () => {
  const authors = buildAuthorMap([profile({ id: UUID_B, username: 'bee' })]);
  const invite = mapSentInvite(
    inviteRow({ status: 'accepted', responded_at: '2026-09-17T13:00:00.000Z' }),
    authors,
  );
  assert.equal(invite?.invitee?.username, 'bee');
  assert.equal(invite?.respondedAt, '2026-09-17T13:00:00.000Z');
  // Invitee drops to null when the profile isn't hydrated (unfriended).
  assert.equal(mapSentInvite(inviteRow({ status: 'pending' }), new Map())?.invitee, null);
});

// ---------------------------------------------------------------------------
// Validators
// ---------------------------------------------------------------------------

test('validateUuid normalizes case/whitespace and rejects non-UUIDs', () => {
  assert.equal(validateUuid('  ' + UUID_A.toUpperCase() + '  ', 'id'), UUID_A);
  assert.throws(() => validateUuid('not-a-uuid', 'id'), CircleDataError);
  assert.throws(() => validateUuid(123, 'id'), /id must be a valid UUID/);
});

test('validatePostBody / validateCommentBody enforce their length bounds', () => {
  assert.equal(validatePostBody('  hello  '), 'hello');
  assert.throws(() => validatePostBody(''), /body must be 1 to 2000/);
  assert.throws(() => validatePostBody('x'.repeat(2001)), /body must be 1 to 2000/);

  assert.equal(validateCommentBody('nice'), 'nice');
  assert.throws(() => validateCommentBody(''), /body must be 1 to 1000/);
  assert.throws(() => validateCommentBody('x'.repeat(1001)), /body must be 1 to 1000/);
});

test('parseCreatePostInput accepts a bare body and trims it', () => {
  assert.deepEqual(parseCreatePostInput({ body: '  Just a thought  ' }), {
    body: 'Just a thought',
    imagePath: null,
    linkKind: null,
    linkRefId: null,
    linkDescription: null,
  });
});

test('parseCreatePostInput requires link_kind and link_ref_id together (CD-005)', () => {
  assert.throws(
    () => parseCreatePostInput({ body: 'x', link_kind: 'goal' }),
    /link_kind and link_ref_id must be provided together/,
  );
  assert.throws(
    () => parseCreatePostInput({ body: 'x', link_ref_id: UUID_A }),
    /link_kind and link_ref_id must be provided together/,
  );
});

test('parseCreatePostInput validates link kind, ref, and the ≤280 description', () => {
  const parsed = parseCreatePostInput({
    body: 'Linked',
    link_kind: 'reflection',
    link_ref_id: UUID_A.toUpperCase(),
    link_description: '  On slower weeks  ',
  });
  assert.equal(parsed.linkKind, 'reflection');
  assert.equal(parsed.linkRefId, UUID_A);
  assert.equal(parsed.linkDescription, 'On slower weeks');

  assert.throws(
    () => parseCreatePostInput({ body: 'x', link_kind: 'note', link_ref_id: UUID_A }),
    /Unsupported link_kind/,
  );
  assert.throws(
    () => parseCreatePostInput({ body: 'x', link_kind: 'goal', link_ref_id: 'nope' }),
    /link_ref_id must be a valid UUID/,
  );
  assert.throws(
    () =>
      parseCreatePostInput({
        body: 'x',
        link_kind: 'goal',
        link_ref_id: UUID_A,
        link_description: 'y'.repeat(281),
      }),
    /link_description must be 1 to 280/,
  );
});

test('parseInviteeIds requires a non-empty ≤50 array and dedupes normalized ids', () => {
  assert.deepEqual(parseInviteeIds([UUID_A, UUID_A.toUpperCase(), UUID_B]), [UUID_A, UUID_B]);
  assert.throws(() => parseInviteeIds([]), /non-empty array/);
  assert.throws(() => parseInviteeIds('nope'), /non-empty array/);
  assert.throws(() => parseInviteeIds(Array(51).fill(UUID_A)), /at most 50/);
  assert.throws(() => parseInviteeIds([UUID_A, 'bad']), /invitee_id must be a valid UUID/);
});

test('validateInviteResponse accepts only accepted/declined', () => {
  assert.equal(validateInviteResponse('accepted'), 'accepted');
  assert.equal(validateInviteResponse('declined'), 'declined');
  assert.throws(() => validateInviteResponse('withdrawn'), /accepted.*declined/);
  assert.throws(() => validateInviteResponse(null), /accepted.*declined/);
});

test('parsePublicGoalId accepts an explicit null (make private) or a valid UUID', () => {
  assert.equal(parsePublicGoalId(null), null);
  assert.equal(parsePublicGoalId(UUID_A.toUpperCase()), UUID_A);
  assert.throws(() => parsePublicGoalId('nope'), /goal_id must be a valid UUID/);
  assert.throws(() => parsePublicGoalId(undefined), /goal_id must be a valid UUID/);
});
