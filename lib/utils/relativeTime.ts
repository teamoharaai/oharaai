export function formatRelativeTime(isoTimestamp: string | null): string | null {
  if (isoTimestamp === null) return null;

  const diffDays = Math.floor(
    (Date.now() - new Date(isoTimestamp).getTime()) / (1000 * 60 * 60 * 24),
  );

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  return `${diffDays} days ago`;
}
