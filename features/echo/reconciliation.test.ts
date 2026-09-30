import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

test('Echo reconciliation is absent from page-render lifecycle', () => {
  const dashboard = read('app/(app)/dashboard.tsx');
  const route = read('app/api/echo/reconcile+api.ts');
  assert.doesNotMatch(dashboard, /api\/echo\/reconcile|reconcileInFlight/);
  assert.match(route, /claim_echo_reconciliation_v1/);
  assert.match(route, /p_limit: entryIds \? entryIds\.length : 3/);
  assert.match(route, /p_lease_seconds: 300/);
});

test('Echo work is change-scoped, leased, and safely retryable', () => {
  const migration = read('supabase/migrations/083_domain_computation_jobs.sql');
  const legacyEntryRoute = read('app/api/entries/[id]+api.ts');
  const legacyService = read('features/echo/services/echo-service.ts');
  assert.match(migration, /for update skip locked/i);
  assert.match(migration, /reconcile_lease_expires_at <= statement_timestamp\(\)/i);
  assert.match(migration, /entry\.ai_insight_requested = true/i);
  assert.match(legacyEntryRoute, /echoReconciliationEntryId/);
  assert.match(legacyService, /JSON\.stringify\(\{ entryIds: \[body\.echoReconciliationEntryId\] \}\)/);
});
