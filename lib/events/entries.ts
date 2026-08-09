type LatestEntryInvalidationListener = () => void;

const latestEntryListeners = new Set<LatestEntryInvalidationListener>();

export function invalidateDashboardLatestEntry(): void {
  for (const listener of latestEntryListeners) listener();
}

export function subscribeToDashboardLatestEntryInvalidation(
  listener: LatestEntryInvalidationListener,
): () => void {
  latestEntryListeners.add(listener);
  return () => {
    latestEntryListeners.delete(listener);
  };
}

