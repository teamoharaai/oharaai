import assert from 'node:assert/strict';
import { mkdtempSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { visualEvidencePath } from './visual-evidence.ts';

test('capture evidence uses the explicit artifact root without changing snapshot paths', () => {
  const previous = process.env.OHARA_VISUAL_OUTPUT_DIR;
  const root = mkdtempSync(join(tmpdir(), 'ohara-evidence-test-'));
  try {
    process.env.OHARA_VISUAL_OUTPUT_DIR = root;
    const target = visualEvidencePath('docs/ui-checkpoints/example/capture.png');
    assert.equal(target, resolve(root, 'docs/ui-checkpoints/example/capture.png'));
    assert.equal(existsSync(dirname(target)), true);
  } finally {
    if (previous === undefined) delete process.env.OHARA_VISUAL_OUTPUT_DIR;
    else process.env.OHARA_VISUAL_OUTPUT_DIR = previous;
  }
});

test('existing capture callers retain their working-directory default', () => {
  const previous = process.env.OHARA_VISUAL_OUTPUT_DIR;
  try {
    delete process.env.OHARA_VISUAL_OUTPUT_DIR;
    assert.equal(visualEvidencePath('docs/capture.png'), resolve('docs/capture.png'));
  } finally {
    if (previous !== undefined) process.env.OHARA_VISUAL_OUTPUT_DIR = previous;
  }
});
