import assert from 'node:assert/strict';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { verifyLocalTarget } from '../../scripts/momentum-local-target.mjs';

async function environmentFile(url: string): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), 'ohara-momentum-env-'));
  const path = join(directory, '.env.local');
  await writeFile(path, [
    `EXPO_PUBLIC_SUPABASE_URL=${url}`,
    `EXPO_PUBLIC_SUPABASE_ANON_KEY=${'a'.repeat(32)}`,
    `SUPABASE_SERVICE_ROLE_KEY=${'s'.repeat(32)}`,
  ].join('\n'));
  return path;
}

test('local target guard accepts only the standard localhost Supabase endpoint', async () => {
  const path = await environmentFile('http://127.0.0.1:54321');
  assert.equal(verifyLocalTarget({ envPath: path }).origin, 'http://127.0.0.1:54321');
});

test('local target guard rejects shared, alternate-port, and non-http targets', async () => {
  for (const target of [
    'https://project.supabase.co',
    'http://127.0.0.1:54322',
    'https://localhost:54321',
  ]) {
    const path = await environmentFile(target);
    assert.throws(() => verifyLocalTarget({ envPath: path }), /Refusing non-local Supabase target/);
  }
});
