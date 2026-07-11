import type { EchoBrt } from '@/types/brt';

export type BrtCategory = 'bud' | 'rose' | 'thorn';

const TIE_BREAK_PRIORITY: BrtCategory[] = ['bud', 'rose', 'thorn'];

// Dominant bucket by count; ties break bud -> rose -> thorn; null if all empty.
export function resolveBrt(brt: EchoBrt | null | undefined): BrtCategory | null {
  if (!brt) return null;

  const counts: Record<BrtCategory, number> = {
    bud: brt.bud.length,
    rose: brt.rose.length,
    thorn: brt.thorn.length,
  };

  const maxCount = Math.max(counts.bud, counts.rose, counts.thorn);
  if (maxCount === 0) return null;

  return TIE_BREAK_PRIORITY.find((category) => counts[category] === maxCount) ?? null;
}
