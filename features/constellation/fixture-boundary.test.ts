import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const featureRoot = dirname(fileURLToPath(import.meta.url));
const routeRoot = resolve(featureRoot, '../../app');

function sourceFiles(root: string): string[] {
  return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(root, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return ['.ts', '.tsx'].includes(extname(entry.name)) ? [path] : [];
  });
}

function disallowedFixtureImports(path: string): string[] {
  const source = readFileSync(path, 'utf8');
  const importPattern = /(?:from\s+|import\s*\()\s*['"]([^'"]+)['"]/g;
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

test('production routes cannot import Constellation fixtures or preview modules', () => {
  const violations = sourceFiles(routeRoot).flatMap((path) => (
    disallowedFixtureImports(path).map((specifier) => ({ path, specifier }))
  ));

  assert.deepEqual(violations, []);
});

test('production Constellation modules cannot import the development preview boundary', () => {
  const productionFeatureFiles = sourceFiles(featureRoot).filter((path) => (
    !path.includes('/dev/')
    && !path.endsWith('.test.ts')
    && !path.endsWith('/fixtures.ts')
  ));
  const violations = productionFeatureFiles.flatMap((path) => (
    disallowedFixtureImports(path).map((specifier) => ({ path, specifier }))
  ));

  assert.deepEqual(violations, []);
});
