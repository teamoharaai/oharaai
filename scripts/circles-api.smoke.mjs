// Circles API smoke test — exercises app/api/circles/** against a signed-in dev
// session, mirroring scripts/momentum-api.smoke.mjs.
//
// Requires a running web server and a signed-in session. Configure via env:
//   OHARA_CIRCLES_WEB_ORIGIN   web origin serving the API (default http://127.0.0.1:8099)
//   EXPO_PUBLIC_SUPABASE_URL   Supabase URL (else read from OHARA_CIRCLES_ENV_PATH/.env.local)
//   EXPO_PUBLIC_SUPABASE_ANON_KEY  anon key (same fallback)
//   OHARA_CIRCLES_ACCESS_TOKEN a ready access token (skips password sign-in), OR
//   OHARA_CIRCLES_EMAIL + OHARA_CIRCLES_PASSWORD  a fixture account to sign in
//
// Read-only endpoints are always checked; the create→delete post round-trip runs
// only when a session is available. Never commit real credentials.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { parseEnvironment } from './momentum-local-target.mjs';

const webOrigin = process.env.OHARA_CIRCLES_WEB_ORIGIN ?? 'http://127.0.0.1:8099';

function envFallback() {
  const envPath = process.env.OHARA_CIRCLES_ENV_PATH ?? '.env.local';
  try {
    return parseEnvironment(readFileSync(resolve(envPath), 'utf8'));
  } catch {
    return {};
  }
}

const fileEnv = envFallback();
const supabaseUrl =
  process.env.EXPO_PUBLIC_SUPABASE_URL ?? fileEnv.EXPO_PUBLIC_SUPABASE_URL;
const anonKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? fileEnv.EXPO_PUBLIC_SUPABASE_ANON_KEY;

async function resolveAccessToken() {
  if (process.env.OHARA_CIRCLES_ACCESS_TOKEN) {
    return process.env.OHARA_CIRCLES_ACCESS_TOKEN;
  }
  const email = process.env.OHARA_CIRCLES_EMAIL;
  const password = process.env.OHARA_CIRCLES_PASSWORD;
  if (!email || !password) return null;

  assert.ok(supabaseUrl, 'EXPO_PUBLIC_SUPABASE_URL is required to sign in');
  assert.ok(anonKey, 'EXPO_PUBLIC_SUPABASE_ANON_KEY is required to sign in');
  const client = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  assert.equal(error, null, `sign-in failed: ${error?.message}`);
  assert.ok(data.session?.access_token, 'no access token returned');
  return data.session.access_token;
}

function authed(token, init = {}) {
  return {
    ...init,
    headers: {
      ...(init.headers ?? {}),
      Authorization: `Bearer ${token}`,
    },
  };
}

async function json(response) {
  const payload = await response.json();
  return payload;
}

// --- Unauthorized guard (no session needed) --------------------------------
const unauth = await fetch(`${webOrigin}/api/circles/feed`);
assert.equal(unauth.status, 401, 'feed without auth should be 401');

const unauthMutation = await fetch(`${webOrigin}/api/circles/posts`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ body: 'nope' }),
});
assert.equal(unauthMutation.status, 401, 'post without auth should be 401');

const token = await resolveAccessToken();
if (!token) {
  console.log(
    JSON.stringify({
      skipped: 'no session — set OHARA_CIRCLES_ACCESS_TOKEN or OHARA_CIRCLES_EMAIL/PASSWORD',
      unauthorizedFeed: unauth.status,
      unauthorizedMutation: unauthMutation.status,
      webOrigin,
    }),
  );
  process.exit(0);
}

// --- Read endpoints ---------------------------------------------------------
const reads = {
  feed: '/api/circles/feed',
  publicGoal: '/api/circles/public-goal',
  friendsPublicGoals: '/api/circles/friends/public-goals',
  sharedWithMe: '/api/circles/shared-with-me',
  invites: '/api/circles/invites',
  invitesSent: '/api/circles/invites/sent',
  saved: '/api/circles/saved',
  linkable: '/api/circles/linkable',
};
const readStatuses = {};
for (const [name, path] of Object.entries(reads)) {
  const response = await fetch(`${webOrigin}${path}`, authed(token));
  readStatuses[name] = response.status;
  assert.equal(response.status, 200, `${name} should be 200`);
  const payload = await json(response);
  assert.equal(payload.ok, true, `${name} envelope ok`);
}

// --- Validation: empty body → 400 ------------------------------------------
const badPost = await fetch(
  `${webOrigin}/api/circles/posts`,
  authed(token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ body: '   ' }),
  }),
);
assert.equal(badPost.status, 400, 'empty post body should be 400');

// --- Create → delete a reflection post -------------------------------------
const createResponse = await fetch(
  `${webOrigin}/api/circles/posts`,
  authed(token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ body: `Circles smoke ${new Date().toISOString()}` }),
  }),
);
assert.equal(createResponse.status, 201, 'create post should be 201');
const created = await json(createResponse);
const postId = created.data?.id;
assert.ok(postId, 'create post returns an id');

const feedAfter = await fetch(`${webOrigin}/api/circles/feed`, authed(token));
const feedPayload = await json(feedAfter);
assert.ok(
  feedPayload.data.posts.some((post) => post.id === postId),
  'new post appears in the feed',
);

// Delete a non-existent post → 404
const missingDelete = await fetch(
  `${webOrigin}/api/circles/posts/00000000-0000-4000-8000-000000000000`,
  authed(token, { method: 'DELETE' }),
);
assert.equal(missingDelete.status, 404, 'deleting a missing post should be 404');

const deleteResponse = await fetch(
  `${webOrigin}/api/circles/posts/${postId}`,
  authed(token, { method: 'DELETE' }),
);
assert.equal(deleteResponse.status, 200, 'delete own post should be 200');

console.log(
  JSON.stringify({
    createdPostId: postId,
    deleteStatus: deleteResponse.status,
    emptyBodyStatus: badPost.status,
    missingDeleteStatus: missingDelete.status,
    readStatuses,
    unauthorizedFeed: unauth.status,
    unauthorizedMutation: unauthMutation.status,
    webOrigin,
  }),
);
