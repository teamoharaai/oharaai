/**
 * Friend-connection capability and RLS test.
 *
 * Verifies migration 030 with three temporary authenticated users:
 * - direct client inserts/updates/deletes are denied
 * - only the addressee can accept or decline
 * - repeated outgoing sends are idempotent
 * - accepted/pending edges are visible only to their participants
 * - connection hydration cannot fetch arbitrary profiles
 * - same-direction re-requests are cooled down after a decline
 * - the person who declined may initiate a request in the opposite direction
 *
 * Prerequisites:
 *   - migration 030 applied to the target Supabase project
 *   - EXPO_PUBLIC_SUPABASE_URL in .env.local
 *   - EXPO_PUBLIC_SUPABASE_ANON_KEY in .env.local
 *   - SUPABASE_SERVICE_ROLE_KEY in .env.local
 *
 * Run with:
 *   npx tsx scripts/test-friend-security.ts
 *
 * The script deletes every temporary auth user in a finally block. Deleting
 * those users cascades through profiles and friend_connections.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { loadEnvFile } from 'node:process';
import * as path from 'node:path';

try {
  loadEnvFile(path.resolve(__dirname, '../.env.local'));
} catch {
  // Missing configuration is reported with the complete requirement list below.
}

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

interface TestIdentity {
  id: string;
  email: string;
  password: string;
  client: SupabaseClient;
}

interface ErrorLike {
  code?: string;
  message: string;
}

function pass(label: string): void {
  console.log(`  PASS  ${label}`);
}

function requireCondition(condition: unknown, label: string, detail?: string): asserts condition {
  if (!condition) {
    throw new Error(`${label}${detail ? ` — ${detail}` : ''}`);
  }
  pass(label);
}

function requireError(error: ErrorLike | null, label: string, message?: string): void {
  requireCondition(error !== null, label, 'operation unexpectedly succeeded');
  if (message) {
    requireCondition(
      error.message.includes(message),
      `${label} returned the expected domain error`,
      `expected "${message}", received "${error.message}"`,
    );
  }
}

async function createIdentity(
  admin: SupabaseClient,
  label: 'a' | 'b' | 'c',
  suffix: string,
  createdUserIds: string[],
): Promise<TestIdentity> {
  const email = `codex.friend-security-${label}-${suffix}@example.com`;
  const password = `FriendSecurity-${suffix}!`;
  const username = `fs_${label}_${suffix}`.slice(0, 20);

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      display_name: `Friend Security ${label.toUpperCase()}`,
      username,
    },
  });

  if (error || !data.user) {
    throw new Error(`Could not create test user ${label.toUpperCase()}: ${error?.message ?? 'no user returned'}`);
  }

  createdUserIds.push(data.user.id);

  const client = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error: signInError } = await client.auth.signInWithPassword({ email, password });
  if (signInError) {
    throw new Error(`Could not sign in test user ${label.toUpperCase()}: ${signInError.message}`);
  }

  return { id: data.user.id, email, password, client };
}

async function sendRequest(client: SupabaseClient, addresseeId: string): Promise<string> {
  const { data, error } = await client.rpc('send_friend_request', {
    p_addressee_id: addresseeId,
  });
  if (error || typeof data !== 'string') {
    throw new Error(`send_friend_request failed: ${error?.message ?? 'no connection id returned'}`);
  }
  return data;
}

async function main(): Promise<void> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SERVICE_ROLE_KEY) {
    throw new Error(
      'Missing environment variables. Set EXPO_PUBLIC_SUPABASE_URL, ' +
      'EXPO_PUBLIC_SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY in .env.local.',
    );
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const anon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const createdUserIds: string[] = [];
  const suffix = `${Date.now().toString(36).slice(-7)}${Math.random().toString(36).slice(2, 6)}`;

  try {
    console.log('\nCreating three temporary users...');
    const userA = await createIdentity(admin, 'a', suffix, createdUserIds);
    const userB = await createIdentity(admin, 'b', suffix, createdUserIds);
    const userC = await createIdentity(admin, 'c', suffix, createdUserIds);
    pass('temporary users created and authenticated');

    console.log('\nChecking capability boundaries...');
    const { error: anonSendError } = await anon.rpc('send_friend_request', {
      p_addressee_id: userB.id,
    });
    requireError(anonSendError, 'anonymous caller cannot send a request');

    const { error: forgedAcceptedError } = await userA.client
      .from('friend_connections')
      .insert({
        requester_id: userA.id,
        addressee_id: userB.id,
        status: 'accepted',
        responded_at: new Date().toISOString(),
      });
    requireError(forgedAcceptedError, 'client cannot forge an accepted friendship');

    const { error: directPendingError } = await userA.client
      .from('friend_connections')
      .insert({
        requester_id: userA.id,
        addressee_id: userB.id,
        status: 'pending',
      });
    requireError(directPendingError, 'client cannot bypass the send-request capability');

    console.log('\nChecking send, visibility, and hydration...');
    const connectionAB = await sendRequest(userA.client, userB.id);
    pass('requester can send a pending request');

    const repeatedConnectionAB = await sendRequest(userA.client, userB.id);
    requireCondition(
      repeatedConnectionAB === connectionAB,
      'repeated outgoing request is idempotent',
      `expected ${connectionAB}, received ${repeatedConnectionAB}`,
    );

    const { data: outsiderRows, error: outsiderReadError } = await userC.client
      .from('friend_connections')
      .select('id')
      .eq('id', connectionAB);
    requireCondition(!outsiderReadError, 'outsider read query completes without leaking an error');
    requireCondition(
      Array.isArray(outsiderRows) && outsiderRows.length === 0,
      'outsider cannot read another pair’s connection',
    );

    const { data: arbitraryProfiles, error: arbitraryProfilesError } = await userC.client.rpc(
      'get_profiles_by_ids',
      { user_ids: [userA.id, userB.id] },
    );
    requireCondition(!arbitraryProfilesError, 'connection-scoped hydration query succeeds');
    requireCondition(
      Array.isArray(arbitraryProfiles) && arbitraryProfiles.length === 0,
      'unconnected caller cannot hydrate arbitrary profiles',
    );

    const { data: pendingProfile, error: pendingProfileError } = await userB.client.rpc(
      'get_profiles_by_ids',
      { user_ids: [userA.id] },
    );
    requireCondition(!pendingProfileError, 'pending-party hydration query succeeds');
    requireCondition(
      Array.isArray(pendingProfile) && pendingProfile.length === 1,
      'pending request parties can hydrate each other',
    );

    console.log('\nChecking response authorization and accepted state...');
    const { error: requesterResponseError } = await userA.client.rpc(
      'respond_to_friend_request',
      { p_connection_id: connectionAB, p_response: 'accepted' },
    );
    requireError(
      requesterResponseError,
      'requester cannot accept their own request',
      'friend_request_not_found_or_already_handled',
    );

    const { error: outsiderResponseError } = await userC.client.rpc(
      'respond_to_friend_request',
      { p_connection_id: connectionAB, p_response: 'declined' },
    );
    requireError(
      outsiderResponseError,
      'outsider cannot respond to another pair’s request',
      'friend_request_not_found_or_already_handled',
    );

    const { error: directUpdateError } = await userB.client
      .from('friend_connections')
      .update({ status: 'accepted', responded_at: new Date().toISOString() })
      .eq('id', connectionAB);
    requireError(directUpdateError, 'addressee cannot bypass the response capability');

    const { data: acceptedId, error: acceptError } = await userB.client.rpc(
      'respond_to_friend_request',
      { p_connection_id: connectionAB, p_response: 'accepted' },
    );
    requireCondition(!acceptError && acceptedId === connectionAB, 'addressee can accept a pending request');

    const { error: repeatedAcceptError } = await userB.client.rpc(
      'respond_to_friend_request',
      { p_connection_id: connectionAB, p_response: 'accepted' },
    );
    requireError(
      repeatedAcceptError,
      'handled request cannot be accepted twice',
      'friend_request_not_found_or_already_handled',
    );

    const { error: acceptedPairSendError } = await userA.client.rpc('send_friend_request', {
      p_addressee_id: userB.id,
    });
    requireError(
      acceptedPairSendError,
      'accepted pair cannot create another live request',
      'friend_connection_exists',
    );

    const { error: directDeleteError } = await userA.client
      .from('friend_connections')
      .delete()
      .eq('id', connectionAB);
    requireError(directDeleteError, 'friendship cannot be deleted outside a future removal capability');

    console.log('\nChecking decline cooldown and reverse-direction agency...');
    const connectionAC = await sendRequest(userA.client, userC.id);
    const { data: declinedId, error: declineError } = await userC.client.rpc(
      'respond_to_friend_request',
      { p_connection_id: connectionAC, p_response: 'declined' },
    );
    requireCondition(!declineError && declinedId === connectionAC, 'addressee can decline a pending request');

    const { data: declinedHydration, error: declinedHydrationError } = await userA.client.rpc(
      'get_profiles_by_ids',
      { user_ids: [userC.id] },
    );
    requireCondition(!declinedHydrationError, 'post-decline hydration query succeeds');
    requireCondition(
      Array.isArray(declinedHydration) && declinedHydration.length === 0,
      'declined history does not authorize profile hydration',
    );

    const { error: cooldownError } = await userA.client.rpc('send_friend_request', {
      p_addressee_id: userC.id,
    });
    requireError(
      cooldownError,
      'declined requester cannot immediately resend',
      'friend_request_cooldown',
    );

    const reverseConnection = await sendRequest(userC.client, userA.id);
    requireCondition(
      typeof reverseConnection === 'string' && reverseConnection !== connectionAC,
      'person who declined may initiate a reverse-direction request',
    );

    console.log('\nFriend security verification completed successfully.');
  } finally {
    console.log('\nCleaning up temporary users...');
    for (const userId of createdUserIds.reverse()) {
      const { error } = await admin.auth.admin.deleteUser(userId);
      if (error) {
        console.error(`  WARN  could not delete temporary user ${userId}: ${error.message}`);
      }
    }
  }
}

main().catch((error: unknown) => {
  console.error(`\nFAIL  ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
