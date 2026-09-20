import supabase from '@/lib/db/client';

// Owner-private hero photos for goal sticky notes. Mirrors the milestone-photos
// pattern (features/goals/services/milestone-image-service.ts): private bucket,
// 10 MB cap, first path segment is the owner uid so storage RLS scopes objects
// to their owner. Display resolves the stored path to a short-lived signed URL.
export const GOAL_NOTE_PHOTOS_BUCKET = 'goal-note-photos';

const MAX_BYTES = 10 * 1024 * 1024;

function extensionForFile(file: Blob & { name?: string }): string {
  const fromName = file.name?.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (fromName && fromName.length <= 8) return fromName;
  const fromMime = file.type.split('/')[1]?.replace(/[^a-z0-9]/g, '');
  return fromMime || 'jpg';
}

function randomId(): string {
  const cryptoRef = globalThis.crypto as Crypto | undefined;
  if (cryptoRef?.randomUUID) return cryptoRef.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Uploads a sticky-note hero photo and returns its storage path. Since migration
 * 062 the path is stored on the note's Vault item (vault_items.metadata.photoUrl,
 * via updateGoalNote); resolve it to a viewable URL with
 * createSignedGoalNotePhotoUrl. The bucket is unchanged (owner-scoped).
 */
export async function uploadGoalNotePhoto(
  noteId: string,
  file: Blob & { name?: string },
): Promise<{ storagePath: string }> {
  if (!file.type.startsWith('image/')) throw new Error('Choose an image file');
  if (file.size > MAX_BYTES) throw new Error('Photos must be 10 MB or smaller');
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) throw new Error('Sign in to add a photo');

  const storagePath = `${auth.user.id}/${noteId}/${randomId()}.${extensionForFile(file)}`;
  const { error } = await supabase.storage
    .from(GOAL_NOTE_PHOTOS_BUCKET)
    .upload(storagePath, file, { contentType: file.type, upsert: false });
  if (error) throw error;
  return { storagePath };
}

export async function createSignedGoalNotePhotoUrl(storagePath: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from(GOAL_NOTE_PHOTOS_BUCKET)
    .createSignedUrl(storagePath, 60 * 60);
  if (error) throw error;
  return data.signedUrl;
}

/** Best-effort cleanup of a replaced/removed photo. Never throws. */
export async function removeGoalNotePhoto(storagePath: string): Promise<void> {
  try {
    await supabase.storage.from(GOAL_NOTE_PHOTOS_BUCKET).remove([storagePath]);
  } catch {
    // Non-blocking: an orphaned object is harmless and cleaned up out of band.
  }
}
