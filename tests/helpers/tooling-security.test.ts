import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import test from 'node:test';

const require = createRequire(import.meta.url);
const expoRequire = createRequire(require.resolve('expo/package.json'));
const cliRoot = dirname(expoRequire.resolve('@expo/cli/package.json'));
const cliRequire = createRequire(join(cliRoot, 'package.json'));

test('Expo CLI schemas preserve plugin validation, command strictness and output errors with fixed Zod', () => {
  const { PluginSchema, DevToolsPluginOutputSchema } = require(join(cliRoot, 'build/src/start/server/DevToolsPlugin.schema.js'));
  const { createMCPDevToolsExtensionSchema } = require(join(cliRoot, 'build/src/start/server/createMCPDevToolsExtensionSchema.js'));
  const { DevToolsPluginCliExtensionResults } = require(join(cliRoot, 'build/src/start/server/DevToolsPluginCliExtensionResults.js'));
  const plugin = {
    packageName: 'synthetic-plugin', packageRoot: '/tmp/synthetic-plugin',
    cliExtensions: { description: 'QA', entryPoint: 'cli.js', commands: [{
      name: 'inspect', title: 'Inspect', environments: ['cli', 'mcp'],
      parameters: [{ name: 'target', type: 'text', description: 'Target' }],
    }] },
  };
  assert.deepEqual(PluginSchema.parse(plugin), plugin);
  assert.equal(PluginSchema.safeParse({ ...plugin, packageName: '' }).success, false);
  const command = createMCPDevToolsExtensionSchema(plugin);
  assert.deepEqual(command.parse({ command: 'inspect', target: 'test' }), { command: 'inspect', target: 'test' });
  assert.equal(command.safeParse({ command: 'delete' }).success, false);
  assert.equal(command.safeParse({ command: 'inspect', unexpected: true }).success, false);
  const valid = [{ type: 'text', text: 'QA output', level: 'info' }];
  assert.deepEqual(DevToolsPluginOutputSchema.parse(valid), valid);
  const output = new DevToolsPluginCliExtensionResults();
  output.append(JSON.stringify(valid));
  output.append(JSON.stringify([{ type: 'unknown' }]));
  assert.deepEqual(output.getOutput()[0], valid[0]);
  assert.equal(output.getOutput()[1].level, 'error');
  assert.match(output.getOutput()[1].text, /Invalid JSON/);
  const { z } = cliRequire('zod');
  // Fixed constrained collections reject before invoking item validators.
  let itemVisits = 0;
  const bounded = z.array(z.string().superRefine(() => { itemVisits++; })).max(4);
  assert.equal(bounded.safeParse(Array(10000).fill('test')).success, false);
  assert.equal(itemVisits, 0);
});

test('Expo configuration updates preserve nested values, array concatenation and plugin merging safely', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'ohara-config-security-'));
  try {
    writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 'synthetic-app', version: '1.0.0' }));
    writeFileSync(join(dir, 'app.json'), JSON.stringify({ expo: {
      name: 'Synthetic', slug: 'synthetic', sdkVersion: '55.0.0',
      ios: { bundleIdentifier: 'com.example.synthetic', infoPlist: { modes: ['old'] } },
      plugins: [['synthetic-plugin', { retained: true, nested: { old: 1 }, values: [1] }]],
    } }));
    const { modifyConfigAsync } = require('@expo/config');
    const changes = JSON.parse('{"ios":{"supportsTablet":true,"infoPlist":{"modes":["new"]}},"plugins":[["synthetic-plugin",{"nested":{"next":2},"values":[2]}]],"__proto__":{"polluted":true}}');
    const result = await modifyConfigAsync(dir, changes, { skipPlugins: true });
    assert.equal(result.type, 'success');
    assert.equal(result.config.ios.bundleIdentifier, 'com.example.synthetic');
    assert.equal(result.config.ios.supportsTablet, true);
    assert.deepEqual(result.config.ios.infoPlist.modes, ['old', 'new']);
    assert.deepEqual(result.config.plugins, [['synthetic-plugin', { retained: true, nested: { old: 1, next: 2 }, values: [1, 2] }]]);
    assert.equal(result.config.polluted, undefined);
    assert.equal(Object.getPrototypeOf(result.config), Object.prototype);
    const saved = JSON.parse(readFileSync(join(dir, 'app.json'), 'utf8'));
    assert.equal(Object.hasOwn(saved.expo, '__proto__'), false);
    assert.deepEqual(saved.expo.ios, result.config.ios);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('modern build globs, ignore patterns and Xcode identifiers retain their used contracts', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'ohara-glob-security-'));
  try {
    writeFileSync(join(dir, 'app.json'), '{}');
    writeFileSync(join(dir, 'ignore.txt'), '');
    const { glob, globSync } = cliRequire('glob');
    assert.deepEqual(globSync('*.json', { cwd: dir }), ['app.json']);
    const controller = new AbortController();
    controller.abort();
    await assert.rejects(glob('**/*', { cwd: dir, signal: controller.signal }), { name: 'AbortError' });
    const fingerprintRequire = createRequire(require.resolve('@expo/fingerprint/package.json'));
    const { Minimatch } = fingerprintRequire('minimatch');
    assert.equal(new Minimatch('**/*.json', { dot: true }).match('app.json'), true);
    assert.equal(new Minimatch('**/*.json').match('ignore.txt'), false);
    const project = require('xcode').project(join(dir, 'project.pbxproj'));
    project.hash = { project: { objects: {} } };
    const first = project.generateUuid();
    assert.match(first, /^[0-9A-F]{24}$/);
    assert.notEqual(project.generateUuid(), first);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
