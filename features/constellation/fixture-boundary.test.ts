import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import {
  CONSTELLATION_PREVIEW_APPEARANCES,
  CONSTELLATION_PREVIEW_STATES,
  resolveConstellationPreviewAppearance,
  resolveConstellationPreviewState,
} from './dev/preview-state.dev.ts';

const featureRoot = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(featureRoot, '../..');
const routeRoot = resolve(repositoryRoot, 'app');
const conceptReferenceRoot = resolve(
  repositoryRoot,
  'docs/constellation/reference/5df3a3b/concepts',
);
const productionSourceRoots = [
  'app',
  'components',
  'constants',
  'features',
  'lib',
  'store',
].map((path) => resolve(repositoryRoot, path));

function sourceFiles(root: string): string[] {
  return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(root, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return ['.ts', '.tsx'].includes(extname(entry.name)) ? [path] : [];
  });
}

function disallowedFixtureImports(path: string): string[] {
  const source = readFileSync(path, 'utf8');
  const importPattern =
    /(?:from\s+|import\s*\(\s*|require\s*\(\s*|import\s+)['"]([^'"]+)['"]/g;
  const matches: string[] = [];

  for (const match of source.matchAll(importPattern)) {
    const specifier = match[1];
    if (
      /(?:^|\/)dev(?:\/|$)/.test(specifier)
      || /(?:^|\/)[^/]*fixture[^/]*$/.test(specifier)
    ) {
      matches.push(specifier);
    }
  }

  return matches;
}

function documentationReferenceImports(path: string): string[] {
  const source = readFileSync(path, 'utf8');
  const importPattern =
    /(?:from\s+|import\s*\(\s*|require\s*\(\s*|import\s+)['"]([^'"]+)['"]/g;
  return [...source.matchAll(importPattern)]
    .map((match) => match[1])
    .filter((specifier) => (
      specifier.includes('docs/constellation/reference')
      || specifier.includes('constellation/reference/5df3a3b')
    ));
}

function isProductionSource(path: string): boolean {
  return (
    !path.includes('/dev/')
    && !path.endsWith('.test.ts')
    && !path.endsWith('.test.tsx')
    && !path.endsWith('/fixtures.ts')
  );
}

test('production routes cannot import Constellation fixtures or preview modules', () => {
  const violations = sourceFiles(routeRoot).flatMap((path) => (
    disallowedFixtureImports(path).map((specifier) => ({ path, specifier }))
  ));

  assert.deepEqual(violations, []);
});

test('production source cannot import immutable Constellation concept references', () => {
  const violations = productionSourceRoots
    .flatMap(sourceFiles)
    .filter(isProductionSource)
    .flatMap((path) => (
      documentationReferenceImports(path).map((specifier) => ({
        path,
        specifier,
      }))
    ));

  assert.deepEqual(violations, []);
});

test('restored concept references preserve the exact commit 5df3a3b bytes and dimensions', () => {
  const expected = {
    '1a-canvas-restrained.png': {
      height: 1522,
      sha256: 'c4671e77d8527c9dbdd7e6fa7a304695f3c7bcdf53ea382e4673d2ea25244bca',
      width: 2362,
    },
    '1b-canvas-atmospheric.png': {
      height: 1522,
      sha256: 'dfb44e2bbe126cff03ff944339da3dbc359fb1207c23f0b8417edcf1d3275f64',
      width: 2362,
    },
    '1c-goal-inspector.png': {
      height: 1442,
      sha256: 'ddddf43f05e3b6d829729b19cd89a508e678a7401f58cf61cec1fd222f6752dc',
      width: 1642,
    },
    '1d-reflection-inspector.png': {
      height: 1442,
      sha256: '706bddc9a9e44b6695719cb4ff663d9339877e47d05ad16fbf51fcd7fc5762b7',
      width: 1642,
    },
    '1e-empty-state.png': {
      height: 1282,
      sha256: '4cbee78c45e0c870272bb6e614b659c2bead46871a600e862230cef645660470',
      width: 1922,
    },
  } as const;

  assert.deepEqual(
    readdirSync(conceptReferenceRoot).sort(),
    Object.keys(expected).sort(),
  );

  for (const [name, metadata] of Object.entries(expected)) {
    const bytes = readFileSync(resolve(conceptReferenceRoot, name));
    assert.equal(bytes.subarray(1, 4).toString('ascii'), 'PNG');
    assert.equal(bytes.readUInt32BE(16), metadata.width);
    assert.equal(bytes.readUInt32BE(20), metadata.height);
    assert.equal(
      createHash('sha256').update(bytes).digest('hex'),
      metadata.sha256,
    );
  }
});

test('preview query values resolve to deterministic canonical states', () => {
  assert.deepEqual(CONSTELLATION_PREVIEW_APPEARANCES, ['light', 'dark']);
  assert.deepEqual(
    CONSTELLATION_PREVIEW_STATES,
    ['canvas', 'goal', 'reflection', 'empty'],
  );
  assert.equal(resolveConstellationPreviewAppearance('dark'), 'dark');
  assert.equal(resolveConstellationPreviewAppearance(['light', 'dark']), 'light');
  assert.equal(resolveConstellationPreviewAppearance('system'), 'light');
  assert.equal(resolveConstellationPreviewState('goal'), 'goal');
  assert.equal(resolveConstellationPreviewState(['reflection', 'empty']), 'reflection');
  assert.equal(resolveConstellationPreviewState('unknown'), 'canvas');
});

test('production Constellation modules cannot import the development preview boundary', () => {
  const productionFeatureFiles = sourceFiles(featureRoot).filter(isProductionSource);
  const violations = productionFeatureFiles.flatMap((path) => (
    disallowedFixtureImports(path).map((specifier) => ({ path, specifier }))
  ));

  assert.deepEqual(violations, []);
});
