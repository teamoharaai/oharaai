import supabase from '@/lib/db/client';
import { createReferenceId } from '../editor-document';

export const NOTE_IMAGES_BUCKET = 'note-images';

function extensionForFile(file: Blob & { name?: string }): string {
  const fromName = file.name?.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (fromName && fromName.length <= 8) return fromName;
  const fromMime = file.type.split('/')[1]?.replace(/[^a-z0-9]/g, '');
  return fromMime || 'jpg';
}

export async function uploadNoteImage(
  entryId: string,
  file: Blob & { name?: string },
): Promise<{ storagePath: string; alt: string }> {
  if (!file.type.startsWith('image/')) throw new Error('Choose an image file');
  if (file.size > 10 * 1024 * 1024) throw new Error('Images must be 10 MB or smaller');
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) throw new Error('Sign in to insert an image');
  const imageId = createReferenceId('image').replace('image-', '');
  const storagePath = `${auth.user.id}/${entryId}/${imageId}.${extensionForFile(file)}`;
  const { error } = await supabase.storage
    .from(NOTE_IMAGES_BUCKET)
    .upload(storagePath, file, { contentType: file.type, upsert: false });
  if (error) throw error;
  return { storagePath, alt: file.name?.replace(/\.[^.]+$/, '') || 'Note image' };
}

export async function createSignedNoteImageUrl(storagePath: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from(NOTE_IMAGES_BUCKET)
    .createSignedUrl(storagePath, 60 * 60);
  if (error) throw error;
  return data.signedUrl;
}
