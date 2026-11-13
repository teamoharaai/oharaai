import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

/** Capture-only review evidence, separate from asserted visual baselines. */
export function visualEvidencePath(relativePath: string): string {
  const path = resolve(process.env.OHARA_VISUAL_OUTPUT_DIR || process.cwd(), relativePath);
  mkdirSync(dirname(path), { recursive: true });
  return path;
}
