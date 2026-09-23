export interface SessionStorageLike {
  getItem: (key: string) => string | null;
  removeItem: (key: string) => void;
  setItem: (key: string, value: string) => void;
}

export function internalReleaseSessionKey(releaseId: string): string {
  return `ohara:release:${releaseId}:seen`;
}

export interface PatchRelease {
  id: string;
  category: string;
  releasedAt: string;
}

export const PATCH_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000;

export function selectActiveFeaturePatches<T extends PatchRelease>(
  patches: readonly T[],
  nowMs = Date.now(),
): T[] {
  const newestByCategory = new Map<string, T>();
  for (const patch of patches) {
    const releasedAt = Date.parse(patch.releasedAt);
    if (!Number.isFinite(releasedAt) || releasedAt > nowMs) continue;
    const current = newestByCategory.get(patch.category);
    if (!current || releasedAt > Date.parse(current.releasedAt)) newestByCategory.set(patch.category, patch);
  }
  return [...newestByCategory.values()]
    .filter((patch) => nowMs - Date.parse(patch.releasedAt) <= PATCH_LIFETIME_MS)
    .sort((left, right) => Date.parse(right.releasedAt) - Date.parse(left.releasedAt));
}

export function unseenFeaturePatches<T extends PatchRelease>(patches: readonly T[], storage: SessionStorageLike | null): T[] {
  return patches.filter((patch) => storage?.getItem(internalReleaseSessionKey(patch.id)) !== 'seen');
}

export function markFeaturePatchesSeen(patches: readonly PatchRelease[], storage: SessionStorageLike | null): void {
  for (const patch of patches) storage?.setItem(internalReleaseSessionKey(patch.id), 'seen');
}

export function getInternalReleaseSessionStorage(): SessionStorageLike | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}
