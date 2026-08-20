export interface SessionStorageLike {
  getItem: (key: string) => string | null;
  removeItem: (key: string) => void;
  setItem: (key: string, value: string) => void;
}

export function internalReleaseSessionKey(releaseId: string): string {
  return `ohara:internal-release:${releaseId}:shown`;
}

export function shouldShowInternalReleaseForAuthEvent(
  event: string,
  releaseId: string,
  enabled: boolean,
  storage: SessionStorageLike | null,
): boolean {
  const key = internalReleaseSessionKey(releaseId);
  if (event === 'SIGNED_OUT') {
    storage?.removeItem(key);
    return false;
  }
  if (!enabled || event !== 'SIGNED_IN') return false;
  if (storage?.getItem(key) === 'shown') return false;
  storage?.setItem(key, 'shown');
  return true;
}

export function getInternalReleaseSessionStorage(): SessionStorageLike | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}
