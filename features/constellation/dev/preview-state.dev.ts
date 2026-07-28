import type { ConstellationAppearance } from '../visual-tokens.ts';

export const CONSTELLATION_PREVIEW_APPEARANCES = [
  'light',
  'dark',
] as const satisfies readonly ConstellationAppearance[];

export type ConstellationPreviewState =
  | 'canvas'
  | 'goal'
  | 'reflection'
  | 'empty';

export const CONSTELLATION_PREVIEW_STATES = [
  'canvas',
  'goal',
  'reflection',
  'empty',
] as const satisfies readonly ConstellationPreviewState[];

type SearchParamValue = string | readonly string[] | undefined;

function firstSearchParam(value: SearchParamValue): string | undefined {
  return typeof value === 'string' ? value : value?.[0];
}

export function resolveConstellationPreviewAppearance(
  value: SearchParamValue,
): ConstellationAppearance {
  return firstSearchParam(value) === 'dark' ? 'dark' : 'light';
}

export function resolveConstellationPreviewState(
  value: SearchParamValue,
): ConstellationPreviewState {
  const requested = firstSearchParam(value);
  return CONSTELLATION_PREVIEW_STATES.find((state) => state === requested)
    ?? 'canvas';
}
