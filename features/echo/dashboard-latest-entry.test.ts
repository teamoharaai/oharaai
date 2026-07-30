import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DASHBOARD_ENTRY_PREVIEW_MAX_LENGTH,
  resolveDashboardLatestEntryResult,
} from './dashboard-latest-entry.ts';

test('latest-entry rows map to the minimal dashboard summary', () => {
  const updatedAt = '2026-07-30T14:45:00.000Z';

  assert.deepEqual(
    resolveDashboardLatestEntryResult({
      data: {
        id: 'entry-1',
        plain_text: 'A focused dashboard preview.',
        updated_at: updatedAt,
      },
      error: null,
    }),
    {
      id: 'entry-1',
      preview: 'A focused dashboard preview.',
      createdAt: new Date(updatedAt),
    },
  );
});

test('latest-entry mapping bounds long content without changing stored content', () => {
  const content = 'x'.repeat(DASHBOARD_ENTRY_PREVIEW_MAX_LENGTH + 20);
  const summary = resolveDashboardLatestEntryResult({
    data: {
      id: 'entry-2',
      plain_text: content,
      updated_at: '2026-07-30T14:45:00.000Z',
    },
    error: null,
  });

  assert.ok(summary);
  assert.equal(summary.preview, `${'x'.repeat(DASHBOARD_ENTRY_PREVIEW_MAX_LENGTH)}…`);
  assert.equal(content.length, DASHBOARD_ENTRY_PREVIEW_MAX_LENGTH + 20);
});

test('latest-entry no-row results map to the dashboard empty state', () => {
  assert.equal(resolveDashboardLatestEntryResult({ data: null, error: null }), null);
});

test('latest-entry query errors remain distinguishable from no-row results', () => {
  assert.throws(
    () => resolveDashboardLatestEntryResult({
      data: null,
      error: { message: 'database unavailable' },
    }),
    /Unable to load the latest entry summary/,
  );
});
