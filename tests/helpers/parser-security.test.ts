import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import test from 'node:test';

const require = createRequire(import.meta.url);

// A child timeout, unlike node:test's timeout, can stop a synchronous parser loop.
function bounded(script: string) {
  const result = spawnSync(process.execPath, ['-e', script], {
    cwd: join(dirname(require.resolve('decode-uri-component')), '../..'),
    encoding: 'utf8', timeout: 5000, maxBuffer: 32 * 1024,
  });
  assert.equal(result.error, undefined, result.error?.message);
  assert.equal(result.signal, null);
  assert.equal(result.status, 0, result.stderr);
}

test('CommonJS URI decoding retains Unicode, plus, malformed-byte and one-pass semantics', () => {
  const decode = require('decode-uri-component');
  const cases = {
    'a+b%2Bc': 'a b+c',
    'st%C3%A5le%': 'ståle%', '%E4%BD%A0%E5%A5%BD': '你好',
    '%F0%9F%98%80%ab': '😀%ab', '%FE%FF': '\uFFFD\uFFFD',
    '%C2%41': '\uFFFDA', '%C0%AF': '%C0%AF', '%ED%A0%80': '%ED%A0%80',
    '%F4%90%80%80': '%F4%90%80%80', '%F0%9F%98': '%F0%9F%98',
    '%G0': '%G0', '%25C2%zz': '%C2%zz', '%25%41%zz': '%A%zz',
    '%84%D7%25%88%90': '%84%D7%%88%90',
  };
  for (const [input, expected] of Object.entries(cases)) assert.equal(decode(input), expected, input);
  for (const value of [null, undefined, {}, 42]) assert.throws(() => decode(value), TypeError);
});

test('URI decoder and query-string terminate on oversized malformed contiguous and distinct runs', () => {
  bounded(`
    const assert = require('node:assert/strict');
    const decode = require('decode-uri-component');
    const query = require('query-string');
    const contiguous = '%A9'.repeat(50000);
    assert.equal(decode(contiguous), contiguous);
    let distinct = '';
    for (let i = 0; i < 32000; i++) {
      distinct += '%' + Math.floor(i / 256).toString(16).padStart(2, '0') + '%' + (i % 256).toString(16).padStart(2, '0') + 'x';
    }
    distinct += '%zz';
    assert.equal(typeof query.parse('search=' + distinct).search, 'string');
    assert.equal(query.parse('search=' + contiguous).search, contiguous);
  `);
});

test('native navigation path parser preserves Goal, Project and Vault deep-link queries', () => {
  // Exercise the actual shared native/web parser without loading React Native's
  // platform UI runtime in Node. iOS export separately checks Metro resolution.
  const parser = join(dirname(require.resolve('@react-navigation/core/package.json')), 'lib/module/getStateFromPath.js');
  bounded(`
    const assert = require('node:assert/strict');
    const { getStateFromPath } = require(${JSON.stringify(parser)});
    const config = { screens: { Goal: 'goals/:id', Project: 'projects/:id', Vault: 'vault', Note: 'notes/:id', Reflection: 'reflections/:id' } };
    for (const [path, name] of [['goals/goal-id', 'Goal'], ['projects/project-id', 'Project'], ['vault', 'Vault'], ['notes/note-id', 'Note'], ['reflections/reflection-id', 'Reflection']]) {
      const state = getStateFromPath('/' + path + '?section=vault&label=Goal+%F0%9F%8C%B1&search=%G0', config);
      assert.equal(state.routes[0].name, name);
      assert.equal(state.routes[0].params.label, 'Goal 🌱');
      assert.equal(state.routes[0].params.search, '%G0');
      assert.equal(state.routes[0].params.section, 'vault');
    }
    const payload = '%A9'.repeat(50000);
    assert.equal(getStateFromPath('/goals/id?search=' + payload, config).routes[0].params.search, payload);
  `);
});

test('image-size rejects malformed ICNS, JXL and HEIF without blocking Metro', () => {
  bounded(`
    const assert = require('node:assert/strict');
    const size = require('image-size');
    const box = (name, payload = Buffer.alloc(0), declared) => {
      const out = Buffer.alloc(8 + payload.length);
      out.writeUInt32BE(declared ?? out.length); out.write(name, 4); payload.copy(out, 8); return out;
    };
    const icns = Buffer.alloc(16);
    icns.write('icns'); icns.writeUInt32BE(16, 4); icns.write('ic07', 8);
    for (const length of [0, 1, 7]) {
      icns.writeUInt32BE(length, 12); assert.throws(() => size(icns), /Invalid ICNS/);
    }
    icns.writeUInt32BE(8, 12);
    assert.equal(size(icns).width, 128);
    assert.throws(() => size(icns.subarray(0, 12)), /Invalid ICNS/);
    const jxlHeader = Buffer.concat([box('JXL ', Buffer.from([13, 10, 135, 10])), box('ftyp', Buffer.from('jxl '))]);
    for (const length of [0, 1, 7, 8]) {
      assert.throws(() => size(Buffer.concat([jxlHeader, box('jxlp', Buffer.alloc(0), length)])));
    }
    const heifHeader = box('ftyp', Buffer.from('heic'));
    const nested = ispe => box('meta', Buffer.concat([Buffer.alloc(4), box('iprp', box('ipco', ispe))]));
    for (const length of [0, 1, 7, 8]) {
      assert.throws(() => size(Buffer.concat([heifHeader, nested(box('ispe', Buffer.alloc(0), length))])));
    }
    const dimensions = Buffer.alloc(12); dimensions.writeUInt32BE(320, 4); dimensions.writeUInt32BE(240, 8);
    const valid = size(Buffer.concat([heifHeader, nested(box('ispe', dimensions))]));
    assert.equal(valid.width, 320); assert.equal(valid.height, 240);
  `);
});
