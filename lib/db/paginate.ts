// Generic keyset-free pagination over a Supabase-style `.range()` reader.
//
// Mirrors the inlined loops in lib/db/friends.ts and lib/db/constellation.ts
// (fetch fixed-size pages, ordered deterministically by the caller, until a
// short page signals the end) so a single goal's tracker_logs can exceed the
// implicit 1000-row response ceiling without truncating sums.
//
// The reader is injected as a callback so this helper stays pure and
// test-reachable with relative imports (D-004): no Supabase client or `@/`
// alias is imported here.

/** Repository-wide page size, matching lib/db/friends.ts. */
export const PAGE_SIZE = 500;

export interface PageResult<T> {
  data: T[] | null;
  error: unknown;
}

/**
 * Reads every page from `fetchPage`, which is called with an inclusive
 * `[from, to]` row range, until it returns fewer than `pageSize` rows. Throws
 * if any page reports an `error`, so a partial read never masquerades as a
 * complete result.
 */
export async function fetchAllPages<T>(
  fetchPage: (from: number, to: number) => Promise<PageResult<T>>,
  pageSize: number = PAGE_SIZE,
): Promise<T[]> {
  if (!Number.isInteger(pageSize) || pageSize < 1) {
    throw new Error(`Page size must be a positive integer, received: ${String(pageSize)}`);
  }

  const rows: T[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await fetchPage(from, from + pageSize - 1);
    if (error) throw error;
    const page = data ?? [];
    rows.push(...page);
    if (page.length < pageSize) break;
  }
  return rows;
}
