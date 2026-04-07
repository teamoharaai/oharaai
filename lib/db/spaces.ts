import supabase from './client';
import type { Space, SpaceMember, SpaceType, SpaceRole } from '@/types/space';

// ── DB row types ──────────────────────────────────────────────────────────────

type DbSpaceRow = {
  id: string;
  name: string;
  type: SpaceType;
  owner_id: string;
  config: Space['config'];
  created_at: string;
  updated_at: string;
};

type DbSpaceMemberRow = {
  id: string;
  space_id: string;
  user_id: string;
  role: SpaceRole;
  status: 'active' | 'archived' | 'invited';
  joined_at: string;
};

// ── Mappers ───────────────────────────────────────────────────────────────────

function mapSpace(row: DbSpaceRow): Space {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    ownerId: row.owner_id,
    config: row.config,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapSpaceMember(row: DbSpaceMemberRow): SpaceMember {
  return {
    id: row.id,
    spaceId: row.space_id,
    userId: row.user_id,
    role: row.role,
    status: row.status,
    joinedAt: row.joined_at,
  };
}

// ── Service functions ─────────────────────────────────────────────────────────

export async function getPersonalSpace(userId: string): Promise<Space | null> {
  const { data, error } = await supabase
    .from('spaces')
    .select('id, name, type, owner_id, config, created_at, updated_at')
    .eq('owner_id', userId)
    .eq('type', 'personal')
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;
  return mapSpace(data as unknown as DbSpaceRow);
}

export async function getSpacesForUser(userId: string): Promise<Space[]> {
  const { data: memberships, error: memberError } = await supabase
    .from('space_members')
    .select('space_id')
    .eq('user_id', userId);

  if (memberError) throw new Error(memberError.message);

  const spaceIds = (memberships ?? []).map((m: { space_id: string }) => m.space_id);
  if (spaceIds.length === 0) return [];

  const { data, error } = await supabase
    .from('spaces')
    .select('id, name, type, owner_id, config, created_at, updated_at')
    .in('id', spaceIds);

  if (error) throw new Error(error.message);
  return (data as unknown as DbSpaceRow[] ?? []).map(mapSpace);
}

export async function createSpace(
  space: Omit<Space, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<Space> {
  const { data, error } = await supabase
    .from('spaces')
    .insert({
      name: space.name,
      type: space.type,
      owner_id: space.ownerId,
      config: space.config,
    })
    .select('id, name, type, owner_id, config, created_at, updated_at')
    .single();

  if (error || !data) throw new Error(error?.message ?? 'Failed to create space');
  return mapSpace(data as unknown as DbSpaceRow);
}

export async function getSpaceMembers(spaceId: string): Promise<SpaceMember[]> {
  const { data, error } = await supabase
    .from('space_members')
    .select('id, space_id, user_id, role, status, joined_at')
    .eq('space_id', spaceId);

  if (error) throw new Error(error.message);
  return (data as unknown as DbSpaceMemberRow[] ?? []).map(mapSpaceMember);
}

export async function addSpaceMember(
  spaceId: string,
  userId: string,
  role: SpaceRole,
): Promise<SpaceMember> {
  const { data, error } = await supabase
    .from('space_members')
    .insert({
      space_id: spaceId,
      user_id: userId,
      role,
    })
    .select('id, space_id, user_id, role, status, joined_at')
    .single();

  if (error || !data) throw new Error(error?.message ?? 'Failed to add space member');
  return mapSpaceMember(data as unknown as DbSpaceMemberRow);
}

export async function removeSpaceMember(spaceId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('space_members')
    .delete()
    .eq('space_id', spaceId)
    .eq('user_id', userId);

  if (error) throw new Error(error.message);
}
