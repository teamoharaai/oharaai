import assert from 'node:assert/strict';
import test from 'node:test';
import { authLinkErrorMessage, safeAuthReturnTo } from '../../lib/auth/redirects.ts';

test('auth restores only bounded local workspace destinations including context', () => {
  for (const path of ['/goals?goal=example&view=vault', '/projects/example?view=goals', '/notes/example', '/journal?goal=example', '/calendar?date=2026-11-10', '/momentum#history']) {
    assert.equal(safeAuthReturnTo(path), path);
  }
  for (const path of [undefined, [], '//evil.test', 'https://evil.test', '/login', '/api/delete', '/goals/../login', '/goals/%2e%2e/login', '/goals\\evil', '/goals/%2f%2fevil', '/goals\n', '/goals?x=' + 'a'.repeat(4096)]) {
    assert.equal(safeAuthReturnTo(path), '/dashboard');
  }
});

test('auth error copy does not render untrusted callback diagnostics', () => {
  assert.equal(authLinkErrorMessage(undefined), null);
  for (const value of ['otp_expired', 'verification_failed', '<script>private provider detail</script>']) {
    assert.equal(authLinkErrorMessage(value), 'This sign-in link is invalid or has expired. Please sign in or request a new link.');
  }
});
