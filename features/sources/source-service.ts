import { Platform } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { authedFetch } from '@/lib/api/client';
import supabase from '@/lib/db/client';
import type { SourceProvider, VaultItem } from '@/types/vault';
import {
  resolveSourceMimeType,
  sanitizeSourceFileName,
  SOURCE_BUCKET,
  type SourceAsset,
  validateSourceAsset,
} from './source-domain';

type SourceContext = { kind: 'goal' | 'project'; id: string } | { kind: 'personal' };

export type CreateSourceInput = {
  sourceId?: string;
  itemType: 'link' | 'document' | 'image';
  title: string;
  annotation?: string;
  visibility?: 'private' | 'vault_members';
  metadata: VaultItem['metadata'];
};

function createSourceId(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') return globalThis.crypto.randomUUID();
  const bytes = new Uint8Array(16);
  if (typeof globalThis.crypto?.getRandomValues === 'function') globalThis.crypto.getRandomValues(bytes);
  else for (let index = 0; index < bytes.length; index += 1) bytes[index] = Math.floor(Math.random() * 256);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map((value) => value.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

async function parseSourceResponse(response: Response): Promise<VaultItem> {
  const body = await response.json().catch(() => null) as { error?: string; item?: VaultItem } | null;
  if (!response.ok || !body?.item) throw new Error(body?.error ?? 'Source could not be saved.');
  return body.item;
}

export async function createSourceRecord(context: SourceContext, input: CreateSourceInput): Promise<VaultItem> {
  const endpoint = context.kind === 'project' ? `/api/projects/${context.id}/vault`
    : context.kind === 'goal' ? `/api/vaults/${context.id}` : '/api/sources';
  const response = await authedFetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sourceId: input.sourceId,
      itemType: input.itemType,
      contentKind: 'generic',
      title: input.title,
      content: input.annotation ?? null,
      metadata: input.metadata,
      visibility: input.visibility,
    }),
  });
  return parseSourceResponse(response);
}

export async function pickSourceDocument(): Promise<SourceAsset | null> {
  const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true, multiple: false, type: '*/*' });
  if (result.canceled) return null;
  const asset = result.assets[0];
  const fileName = sanitizeSourceFileName(asset.name || 'Source file');
  const fileSize = asset.size ?? asset.file?.size ?? 0;
  const mimeType = resolveSourceMimeType(fileName, asset.mimeType ?? asset.file?.type);
  const source: SourceAsset = {
    uri: asset.uri,
    file: asset.file ?? undefined,
    fileName,
    fileSize,
    mimeType,
    provider: Platform.OS === 'web' ? 'web_upload' : 'ios_files',
    sourceType: mimeType.startsWith('image/') ? 'image' : 'document',
  };
  validateSourceAsset(source);
  return source;
}

export async function pickSourceImage(): Promise<SourceAsset | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) throw new Error('Photo access is needed only to import the image you choose.');
  const result = await ImagePicker.launchImageLibraryAsync({ allowsMultipleSelection: false, mediaTypes: ['images'], quality: 1 });
  if (result.canceled) return null;
  const asset = result.assets[0];
  const fileName = sanitizeSourceFileName(asset.fileName || `Photo.${asset.mimeType?.split('/')[1] || 'jpg'}`);
  const fileSize = asset.fileSize ?? asset.file?.size ?? 0;
  const mimeType = resolveSourceMimeType(fileName, asset.mimeType ?? asset.file?.type ?? 'image/jpeg');
  const source: SourceAsset = {
    uri: asset.uri,
    file: asset.file ?? undefined,
    fileName,
    fileSize,
    height: asset.height,
    mimeType,
    provider: Platform.OS === 'web' ? 'web_upload' : 'ios_photos',
    sourceType: 'image',
    width: asset.width,
  };
  validateSourceAsset(source);
  return source;
}

async function bodyForAsset(asset: SourceAsset): Promise<Blob | ArrayBuffer> {
  if (asset.file) return asset.file;
  const response = await fetch(asset.uri);
  if (!response.ok) throw new Error('This file could not be read.');
  return response.arrayBuffer();
}

export async function uploadSourceAsset(
  context: SourceContext,
  asset: SourceAsset,
  options: { title?: string; annotation?: string; visibility?: 'private' | 'vault_members' } = {},
): Promise<VaultItem> {
  validateSourceAsset(asset);
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) throw new Error('Sign in to add a Source.');
  const sourceId = createSourceId();
  const storagePath = `${auth.user.id}/${sourceId}/${asset.fileName}`;
  const body = await bodyForAsset(asset);
  const { error: uploadError } = await supabase.storage.from(SOURCE_BUCKET).upload(storagePath, body, {
    cacheControl: '3600', contentType: asset.mimeType, upsert: false,
  });
  if (uploadError) throw new Error(uploadError.message || 'Source upload failed.');

  try {
    const input: CreateSourceInput = {
      sourceId,
      itemType: asset.sourceType,
      title: options.title?.trim() || asset.fileName,
      annotation: options.annotation,
      visibility: options.visibility,
      metadata: {
        fileName: asset.fileName,
        fileSize: asset.fileSize,
        fileType: asset.sourceType === 'image' ? 'image' : asset.fileName.split('.').pop()?.toLowerCase(),
        height: asset.height,
        mimeType: asset.mimeType,
        provider: asset.provider,
        storagePath,
        width: asset.width,
      },
    };
    try {
      return await createSourceRecord(context, input);
    } catch {
      // The caller-generated Source ID makes a retry safe if the first response
      // was lost after the server committed the row.
      return await createSourceRecord(context, input);
    }
  } catch (error) {
    await supabase.storage.from(SOURCE_BUCKET).remove([storagePath]).catch(() => undefined);
    throw error;
  }
}

export async function getSourceAccessUrl(itemId: string): Promise<string> {
  const response = await authedFetch(`/api/sources/${itemId}/access`);
  const body = await response.json().catch(() => null) as { error?: string; url?: string } | null;
  if (!response.ok || !body?.url) throw new Error(body?.error ?? 'Source could not be opened.');
  return body.url;
}

export function providerForLink(): SourceProvider {
  return 'link';
}
