/**
 * RLS two-account isolation test
 *
 * Verifies that User B cannot read, update, or delete goals belonging to User A.
 *
 * Prerequisites:
 *   - SUPABASE_URL and SUPABASE_ANON_KEY in .env.local (anon key for auth sign-in)
 *   - SUPABASE_SERVICE_ROLE_KEY in .env.local (to create test users programmatically)
 *
 * Run with:
 *   npx tsx scripts/test-rls.ts
 *
 * IMPORTANT: These test users are created in your Supabase project.
 * Delete them from the Auth dashboard after testing.
 */

import { createClient } from '@supabase/supabase-js';
import { loadEnvFile } from 'node:process';
import * as path from 'path';

try {
  loadEnvFile(path.resolve(__dirname, '../.env.local'));
} catch {
  // Preserve the existing missing-environment handling below.
}

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Add to .env.local (never commit actual value):
// SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

const TEST_USER_A = { email: 'test+a@ohara.test', password: 'TestPassword123!' };
const TEST_USER_B = { email: 'test+b@ohara.test', password: 'TestPassword123!' };

function pass(label: string) {
  console.log(`  PASS  ${label}`);
}

function fail(label: string, detail?: string) {
  console.error(`  FAIL  ${label}${detail ? ` — ${detail}` : ''}`);
  process.exitCode = 1;
}

async function main() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SERVICE_ROLE_KEY) {
    console.error(
      'Missing env vars. Ensure EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY, ' +
      'and SUPABASE_SERVICE_ROLE_KEY are set in .env.local'
    );
    process.exit(1);
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // ── Step 1: Create test users ─────────────────────────────────────────────
  console.log('\nCreating test users...');

  const { data: userAData, error: userAErr } = await admin.auth.admin.createUser({
    email: TEST_USER_A.email,
    password: TEST_USER_A.password,
    email_confirm: true,
  });
  if (userAErr && !userAErr.message.includes('already')) {
    console.error('Failed to create User A:', userAErr.message);
    process.exit(1);
  }

  const { data: userBData, error: userBErr } = await admin.auth.admin.createUser({
    email: TEST_USER_B.email,
    password: TEST_USER_B.password,
    email_confirm: true,
  });
  if (userBErr && !userBErr.message.includes('already')) {
    console.error('Failed to create User B:', userBErr.message);
    process.exit(1);
  }

  const userAId = userAData?.user?.id;
  const userBId = userBData?.user?.id;
  console.log(`  User A: ${userAId ?? '(already existed)'}`);
  console.log(`  User B: ${userBId ?? '(already existed)'}`);

  // ── Step 2: Sign in as User A, create a goal ──────────────────────────────
  console.log('\nSigning in as User A...');

  const clientA = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { error: signInAErr } = await clientA.auth.signInWithPassword({
    email: TEST_USER_A.email,
    password: TEST_USER_A.password,
  });
  if (signInAErr) {
    console.error('Failed to sign in as User A:', signInAErr.message);
    process.exit(1);
  }

  const { data: goalData, error: goalErr } = await clientA.from('goals').insert({
    title: 'RLS Test Goal',
    category: 'mind',
    mode: 'commitment',
    smart_data: {},
  }).select('id').single();

  if (goalErr || !goalData) {
    console.error('Failed to create goal as User A:', goalErr?.message);
    process.exit(1);
  }

  const goalId = goalData.id as string;
  console.log(`  Created goal: ${goalId}`);

  // ── Step 3: Sign in as User B, attempt to access User A's goal ────────────
  console.log('\nSigning in as User B...');

  const clientB = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { error: signInBErr } = await clientB.auth.signInWithPassword({
    email: TEST_USER_B.email,
    password: TEST_USER_B.password,
  });
  if (signInBErr) {
    console.error('Failed to sign in as User B:', signInBErr.message);
    process.exit(1);
  }

  console.log('\nRunning isolation checks...');

  // Check 1: SELECT — should return empty
  const { data: selectData, error: selectErr } = await clientB
    .from('goals')
    .select('id')
    .eq('id', goalId);

  if (selectErr) {
    pass('SELECT blocked by RLS (error returned)');
  } else if (!selectData || selectData.length === 0) {
    pass('SELECT returns empty (RLS isolation correct)');
  } else {
    fail('SELECT returned User A\'s goal — RLS not blocking reads', `goal id: ${goalId}`);
  }

  // Check 2: UPDATE — should fail or affect 0 rows
  const { error: updateErr, count: updateCount } = await clientB
    .from('goals')
    .update({ title: 'HACKED' })
    .eq('id', goalId);

  if (updateErr) {
    pass('UPDATE blocked by RLS (error returned)');
  } else if (updateCount === 0 || updateCount === null) {
    pass('UPDATE affected 0 rows (RLS isolation correct)');
  } else {
    fail('UPDATE modified User A\'s goal — RLS not blocking writes', `rows affected: ${updateCount}`);
  }

  // Check 3: DELETE — should fail or affect 0 rows
  const { error: deleteErr, count: deleteCount } = await clientB
    .from('goals')
    .delete()
    .eq('id', goalId);

  if (deleteErr) {
    pass('DELETE blocked by RLS (error returned)');
  } else if (deleteCount === 0 || deleteCount === null) {
    pass('DELETE affected 0 rows (RLS isolation correct)');
  } else {
    fail('DELETE removed User A\'s goal — RLS not blocking deletes', `rows affected: ${deleteCount}`);
  }

  // ── Cleanup: delete test goal via User A ──────────────────────────────────
  await clientA.from('goals').delete().eq('id', goalId);
  console.log('\nTest goal cleaned up.');
  console.log('\nDone. Delete test+a@ohara.test and test+b@ohara.test from the Supabase Auth dashboard.\n');
}

main().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
