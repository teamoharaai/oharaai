import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath, URL } from 'node:url';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

const require = createRequire(import.meta.url);
const { quote, parse } = require('shell-quote');

test('Metro supports both buffer sizing and file-backed brand asset metadata', async () => {
  const { getAssetSize, getAssetData } = require('metro/private/Assets');
  for (const name of ['ohara-logo.png', 'project-logo.png', 'goal-mark.png', 'echo-logo.png']) {
    const url = new URL(`../../assets/brand/${name}`, import.meta.url);
    const bytes = readFileSync(url);
    // PNG IHDR provides an independent dimension oracle, not the same parser.
    assert.equal(bytes.toString('ascii', 1, 4), 'PNG');
    assert.deepEqual(getAssetSize('png', bytes, name), {
      width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20),
    });
    const asset = await getAssetData(fileURLToPath(url), `assets/brand/${name}`, [], 'web', '/assets');
    assert.equal(asset.width, bytes.readUInt32BE(16));
    assert.equal(asset.height, bytes.readUInt32BE(20));
  }
});

for (const format of ['require', 'import'] as const) {
  test(`Tiptap ${format} attributes cannot inherit JSON-origin prototype properties`, async () => {
    const { mergeAttributes } = format === 'require'
      ? require('@tiptap/core') : await import('@tiptap/core');
    const input = JSON.parse('{"__proto__":{"src":"invalid:canary","onerror":"canary","data-canary":"inherited"}}');
    const attributes = mergeAttributes({ class: 'note', title: 'Safe title' }, input);
    assert.equal(Object.getPrototypeOf(attributes), Object.prototype);
    assert.equal(Object.hasOwn(attributes, '__proto__'), true);
    assert.equal(attributes.src, undefined);
    assert.equal(attributes.onerror, undefined);
    assert.equal(attributes['data-canary'], undefined);
    const enumerated: string[] = [];
    for (const key in attributes) enumerated.push(key);
    assert.ok(!enumerated.includes('onerror'));
    assert.ok(!enumerated.includes('src'));
    assert.equal(attributes.title, 'Safe title');
    // Exercise the real serializer, using a minimal document that records each
    // setAttribute call. No browser/global prototype mutation is needed.
    const rendered = new Map<string, string>();
    const document = { createElement: () => ({
      nodeType: 1,
      setAttribute: (name: string, value: string) => rendered.set(name, value),
    }) };
    require('@tiptap/pm/model').DOMSerializer.renderSpec(document, ['img', attributes]);
    assert.equal(rendered.has('onerror'), false);
    assert.equal(rendered.has('src'), false);
    assert.equal(rendered.has('data-canary'), false);
    assert.equal(rendered.get('title'), 'Safe title');
    assert.deepEqual(mergeAttributes(
      { class: 'note selected', style: 'color: red; font-weight: bold' },
      { class: 'selected edited', style: 'color: blue' },
    ), { class: 'note selected edited', style: 'color: blue; font-weight: bold' });
  });
}

test('PostCSS rejects annotation paths outside the CSS directory and without a source file', () => {
  const PreviousMap = require('postcss/lib/previous-map');
  const dir = mkdtempSync(join(tmpdir(), 'ohara-map-security-'));
  try {
    mkdirSync(join(dir, 'css'));
    const map = JSON.stringify({ version: 3, sources: ['test.css'], names: [], mappings: '', sourcesContent: ['canary'] });
    writeFileSync(join(dir, 'outside.map'), map);
    writeFileSync(join(dir, 'css', 'valid.map'), map);
    const css = 'a { color: red } /*# sourceMappingURL=../outside.map */';
    assert.equal(new PreviousMap(css, { from: join(dir, 'css', 'input.css') }).text, undefined);
    assert.equal(new PreviousMap(`a{} /*# sourceMappingURL=${join(dir, 'outside.map')} */`, {}).text, undefined);
    assert.equal(new PreviousMap('a{} /*# sourceMappingURL=valid.map */', { from: join(dir, 'css', 'input.css') }).text, map);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('Forge accepts canonical signatures but rejects extra nested DigestAlgorithm elements', () => {
  const forge = require('node-forge');
  const { privateKey, publicKey } = forge.pki.rsa.generateKeyPair({ bits: 1024, workers: 0 });
  const md = forge.md.sha256.create().update('OHARA synthetic signature regression');
  assert.equal(publicKey.verify(md.digest().getBytes(), privateKey.sign(md)), true);
  const a = forge.asn1;
  const digestInfo = a.create(a.Class.UNIVERSAL, a.Type.SEQUENCE, true, [
    a.create(a.Class.UNIVERSAL, a.Type.SEQUENCE, true, [
      a.create(a.Class.UNIVERSAL, a.Type.OID, false, a.oidToDer(forge.pki.oids.sha256).getBytes()),
      a.create(a.Class.UNIVERSAL, a.Type.NULL, false, ''),
      a.create(a.Class.UNIVERSAL, a.Type.NULL, false, ''),
    ]),
    a.create(a.Class.UNIVERSAL, a.Type.OCTETSTRING, false, md.digest().getBytes()),
  ]);
  const malformed = privateKey.sign(a.toDer(digestInfo).getBytes(), 'NONE');
  assert.throws(() => publicKey.verify(md.digest().getBytes(), malformed), /DigestInfo|ASN\.1|signature/i);
});

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
