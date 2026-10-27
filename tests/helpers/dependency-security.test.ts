import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';

const require = createRequire(import.meta.url);
const { quote, parse } = require('shell-quote');

test('shell-quote rejects attacker-controlled operator and comment line breaks', () => {
  for (const separator of ['\n', '\r', '\u2028', '\u2029']) {
    assert.throws(() => quote([{ op: `;${separator}echo unexpected` }]), TypeError);
    assert.throws(() => quote([{ comment: `comment${separator}echo unexpected` }]), TypeError);
  }
  assert.throws(() => quote(parse('echo $VALUE', () => ({ op: ';\necho unexpected' }))), TypeError);
});

test('shell-quote preserves ordinary editor command arguments', () => {
  const args = ['code', '--goto', '/tmp/a file.ts:12', 'literal;value', 'dollar$value'];
  assert.deepEqual(parse(quote(args)), args);
  assert.deepEqual(parse('code --goto "a file.ts:12"'), args.slice(0, 2).concat('a file.ts:12'));
});

test('shell-quote parses a bounded large token list without dropping arguments', { timeout: 5000 }, () => {
  const tokens = parse('word '.repeat(16000));
  assert.equal(tokens.length, 16000);
  assert.ok(tokens.every((token: unknown) => token === 'word'));
});
