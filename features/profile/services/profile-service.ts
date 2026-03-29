import type { CharacterProfile } from '../types';

export async function fetchProfile(_userId: string): Promise<CharacterProfile | null> {
  // TODO: implement Supabase query
  return null;
}

export async function updateProfile(_userId: string, _updates: Partial<CharacterProfile>): Promise<CharacterProfile | null> {
  // TODO: implement Supabase update
  return null;
}
