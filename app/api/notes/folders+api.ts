import { withAuth, type AuthContext } from '@/lib/api/auth';
import { createAuthedClient, isDatabaseConfigured } from '@/lib/db/client';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function folderName(value: unknown): string {
  if (typeof value !== 'string') throw new Error('Folder name is required.');
  const name = value.trim();
  if (!name || name.length > 80) throw new Error('Folder name must be between 1 and 80 characters.');
  return name;
}

function uuid(value: unknown, label: string): string {
  if (typeof value !== 'string' || !UUID.test(value)) throw new Error(`${label} is invalid`);
  return value;
}

export async function POST(request: Request): Promise<Response> {
  if (!isDatabaseConfigured) return Response.json({ error: 'Database not configured' }, { status: 503 });
  return withAuth(handlePost)(request);
}

async function handlePost(request: Request, _params: Record<string, string>, auth: AuthContext): Promise<Response> {
  try {
    const body = await request.json() as { name?: unknown };
    const db = createAuthedClient(auth.accessToken);
    const { data, error } = await db.from('note_folders')
      .insert({ user_id: auth.userId, name: folderName(body.name) })
      .select('id,name,sort_order,created_at,updated_at').single();
    if (error) {
      if (error.code === '23505') return Response.json({ error: 'A folder with that name already exists' }, { status: 409 });
      throw error;
    }
    return Response.json({ folder: { id: data.id, name: data.name, sortOrder: data.sort_order, createdAt: data.created_at, updatedAt: data.updated_at } }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Folder could not be created.';
    const status = /required|between/i.test(message) ? 400 : 500;
    return Response.json({ error: status === 400 ? message : 'Folder could not be created.' }, { status });
  }
}

export async function PATCH(request: Request): Promise<Response> {
  if (!isDatabaseConfigured) return Response.json({ error: 'Database not configured' }, { status: 503 });
  return withAuth(handlePatch)(request);
}

async function handlePatch(request: Request, _params: Record<string, string>, auth: AuthContext): Promise<Response> {
  try {
    const body = await request.json() as { action?: unknown; folderId?: unknown; entryId?: unknown; name?: unknown };
    const db = createAuthedClient(auth.accessToken);
    if (body.action === 'assign') {
      const entryId = uuid(body.entryId, 'Note ID');
      if (body.folderId === null) {
        const { error } = await db.from('note_folder_assignments').delete()
          .eq('user_id', auth.userId).eq('entry_id', entryId);
        if (error) throw error;
        return Response.json({ folderId: null });
      }
      const folderId = uuid(body.folderId, 'Folder ID');
      const { error } = await db.from('note_folder_assignments').upsert({
        user_id: auth.userId,
        entry_id: entryId,
        folder_id: folderId,
      }, { onConflict: 'user_id,entry_id' });
      if (error) throw error;
      return Response.json({ folderId });
    }
    if (body.action === 'rename') {
      const folderId = uuid(body.folderId, 'Folder ID');
      const { error } = await db.from('note_folders').update({ name: folderName(body.name) })
        .eq('id', folderId).eq('user_id', auth.userId);
      if (error) {
        if (error.code === '23505') return Response.json({ error: 'A folder with that name already exists' }, { status: 409 });
        throw error;
      }
      return Response.json({ folderId });
    }
    return Response.json({ error: 'Folder action is invalid' }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Folder could not be updated.';
    const status = /invalid|required|between/i.test(message) ? 400 : 500;
    return Response.json({ error: status === 400 ? message : 'Folder could not be updated.' }, { status });
  }
}

export async function DELETE(request: Request): Promise<Response> {
  if (!isDatabaseConfigured) return Response.json({ error: 'Database not configured' }, { status: 503 });
  return withAuth(handleDelete)(request);
}

async function handleDelete(request: Request, _params: Record<string, string>, auth: AuthContext): Promise<Response> {
  try {
    const body = await request.json() as { folderId?: unknown };
    const folderId = uuid(body.folderId, 'Folder ID');
    const db = createAuthedClient(auth.accessToken);
    const { error } = await db.from('note_folders').delete()
      .eq('id', folderId).eq('user_id', auth.userId);
    if (error) throw error;
    return new Response(null, { status: 204 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Folder could not be deleted.';
    return Response.json({ error: /invalid/i.test(message) ? message : 'Folder could not be deleted.' }, { status: /invalid/i.test(message) ? 400 : 500 });
  }
}
