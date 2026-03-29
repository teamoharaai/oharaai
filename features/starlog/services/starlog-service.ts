import type { StarlogEntry } from '../types';

export async function fetchEntries(_userId: string): Promise<StarlogEntry[]> {
  // TODO: implement Supabase query
  return [];
}

export async function createEntry(_entry: Partial<StarlogEntry>): Promise<StarlogEntry | null> {
  // TODO: implement Supabase insert
  return null;
}
