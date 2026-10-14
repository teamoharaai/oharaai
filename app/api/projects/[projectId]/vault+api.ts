import { withAuth, type AuthContext } from '@/lib/api/auth';
import { createAuthedClient, isDatabaseConfigured } from '@/lib/db/client';
import {
  createVaultItem,
  getOrCreateProjectVaultForUser,
  mapVaultItem,
} from '@/lib/db/vaults';
import type { VaultContentKind, VaultItem, VaultItemType } from '@/types/vault';
import { sanitizeSourceId, sanitizeSourceMetadata } from '@/features/sources/source-server';

type AggregatedVaultItem = VaultItem & {
  directProjectItem: boolean;
  origins: Array<{ goalId: string; goalTitle: string }>;
};

const ITEM_SELECT = 'id, vault_id, item_type, content_kind, title, content, metadata, folder_id, visibility, created_by, sort_order, created_at, updated_at';

function idFrom(params: Record<string, string>): string | null {
  const value = params.projectId?.trim();
  return value && value.length <= 255 ? value : null;
}

export async function GET(request: Request, params: Record<string, string>): Promise<Response> {
  if (!isDatabaseConfigured) return Response.json({ error: 'Database not configured' }, { status: 503 });
  return withAuth(handleGet)(request, params);
}

async function handleGet(_request: Request, params: Record<string, string>, auth: AuthContext): Promise<Response> {
  const projectId = idFrom(params);
  if (!projectId) return Response.json({ error: 'Invalid Project ID' }, { status: 400 });
  try {
    const db = createAuthedClient(auth.accessToken);
    const { data: project, error: projectError } = await db.from('projects').select('id,user_id').eq('id', projectId).maybeSingle();
    if (projectError) throw projectError;
    if (!project) return Response.json({ error: 'Not found' }, { status: 404 });
    const { data: existingVault, error: vaultError } = await db.from('vaults').select('*').eq('project_id', projectId).maybeSingle();
    if (vaultError) throw vaultError;
    const vault = existingVault ?? (project.user_id === auth.userId ? await getOrCreateProjectVaultForUser(projectId, auth.userId, db) : null);
    if (!vault) return Response.json({ error: 'Not found' }, { status: 404 });

    const { data: goals, error: goalsError } = await db.from('goals')
      .select('id, title').eq('project_id', projectId);
    if (goalsError) throw goalsError;
    const goalRows = (goals ?? []) as Array<{ id: string; title: string }>;
    const goalIds = goalRows.map((goal) => goal.id);
    const goalTitleById = new Map(goalRows.map((goal) => [goal.id, goal.title]));

    let goalVaults: Array<{ id: string; goal_id: string }> = [];
    if (goalIds.length) {
      const { data, error } = await db.from('vaults').select('id, goal_id')
        .in('goal_id', goalIds);
      if (error) throw error;
      goalVaults = (data ?? []) as Array<{ id: string; goal_id: string }>;
    }
    const vaultIds = [vault.id, ...goalVaults.map((item) => item.id)];
    const { data: itemRows, error: itemsError } = await db.from('vault_items')
      .select(ITEM_SELECT).in('vault_id', vaultIds).neq('content_kind', 'sticky_note')
      .order('updated_at', { ascending: false });
    if (itemsError) throw itemsError;
    const originByVault = new Map(goalVaults.map((item) => [item.id, {
      goalId: item.goal_id,
      goalTitle: goalTitleById.get(item.goal_id) ?? 'Goal',
    }]));
    const seen = new Set<string>();
    const items: AggregatedVaultItem[] = [];
    for (const row of itemRows ?? []) {
      const item = mapVaultItem(row as never);
      if (seen.has(item.id)) continue;
      seen.add(item.id);
      const origin = originByVault.get(item.vaultId);
      items.push({
        ...item,
        directProjectItem: item.vaultId === vault.id,
        origins: origin ? [origin] : [],
      });
    }
    return Response.json({ vault, items });
  } catch (error) {
    console.error('[projects/vault] GET failed', { projectId, error: error instanceof Error ? error.message : 'unknown' });
    return Response.json({ error: 'Project Vault could not be loaded' }, { status: 500 });
  }
}

export async function POST(request: Request, params: Record<string, string>): Promise<Response> {
  if (!isDatabaseConfigured) return Response.json({ error: 'Database not configured' }, { status: 503 });
  return withAuth(handlePost)(request, params);
}

async function handlePost(request: Request, params: Record<string, string>, auth: AuthContext): Promise<Response> {
  const projectId = idFrom(params);
  if (!projectId) return Response.json({ error: 'Invalid Project ID' }, { status: 400 });
  let raw: { sourceId?: unknown; itemType?: unknown; contentKind?: unknown; title?: unknown; content?: unknown; metadata?: unknown; visibility?: unknown };
  try { raw = await request.json() as typeof raw; }
  catch { return Response.json({ error: 'Invalid JSON body' }, { status: 400 }); }
  let itemType: VaultItemType;
  let title: string | null;
  let content: string | null;
  let sourceId: string | undefined;
  let metadata: VaultItem['metadata'];
  try {
    itemType = raw.itemType as VaultItemType;
    const allowed: VaultItemType[] = ['note', 'link', 'document', 'image'];
    if (!allowed.includes(itemType)) return Response.json({ error: 'Unsupported item type' }, { status: 400 });
    if (raw.contentKind === 'sticky_note') {
      return Response.json({ error: 'This legacy content type is retired and read-only' }, { status: 410 });
    }
    title = typeof raw.title === 'string' ? raw.title.trim().slice(0, 200) || null : null;
    content = typeof raw.content === 'string' ? raw.content.trim().slice(0, 10000) || null : null;
    sourceId = sanitizeSourceId(raw.sourceId);
    metadata = itemType === 'link' || itemType === 'document' || itemType === 'image'
      ? sanitizeSourceMetadata(raw.metadata, { itemType, sourceId, userId: auth.userId })
      : raw.metadata && typeof raw.metadata === 'object' && !Array.isArray(raw.metadata)
        ? raw.metadata as VaultItem['metadata'] : {};
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'Invalid request' }, { status: 400 });
  }
  const contentKind: VaultContentKind = 'generic';
  try {
    const db = createAuthedClient(auth.accessToken);
    const { data: project, error: projectError } = await db.from('projects').select('id,user_id,status').eq('id', projectId).maybeSingle();
    if (projectError) throw projectError;
    if (!project || project.status === 'archived') return Response.json({ error: 'Not found' }, { status: 404 });
    const isOwner = project.user_id === auth.userId;
    const { data: canAdd, error: capabilityError } = await db.rpc('project_has_capability_v11', { p_project_id: projectId, p_user_id: auth.userId, p_capability: 'add_shared_content' });
    if (capabilityError) throw capabilityError;
    // Collaborators cannot create owner-private Vault content. Treat every
    // authorized non-owner write as explicitly Project-shared, including older
    // clients that omitted visibility, so an Admin never gets a misleading 403
    // merely because the UI sent its former owner default.
    const visibility = isOwner
      ? raw.visibility === 'vault_members' ? 'vault_members' : 'private'
      : 'vault_members';
    if (!isOwner && !canAdd) return Response.json({ error: 'Not permitted' }, { status: 403 });
    const { data: existingVault, error: vaultError } = await db.from('vaults').select('*').eq('project_id', projectId).maybeSingle();
    if (vaultError) throw vaultError;
    const vault = existingVault ?? (isOwner ? await getOrCreateProjectVaultForUser(projectId, auth.userId, db) : null);
    if (!vault) return Response.json({ error: 'Not found' }, { status: 404 });
    if (sourceId) {
      const { data: existing, error: existingError } = await db.from('vault_items')
        .select(ITEM_SELECT).eq('id', sourceId).eq('created_by', auth.userId).maybeSingle();
      if (existingError) throw existingError;
      if (existing) return Response.json({ item: { ...mapVaultItem(existing as never), directProjectItem: true, origins: [] } });
    }
    const item = await createVaultItem(vault.id, {
      id: sourceId,
      vaultId: vault.id, itemType, contentKind, title, content, metadata,
      folderId: null, visibility, createdBy: auth.userId, sortOrder: 0,
    }, db);
    return Response.json({ item: { ...item, directProjectItem: true, origins: [] } }, { status: 201 });
  } catch (error) {
    console.error('[projects/vault] POST failed', { projectId, error: error instanceof Error ? error.message : 'unknown' });
    return Response.json({ error: 'Project Vault item could not be saved' }, { status: 500 });
  }
}
