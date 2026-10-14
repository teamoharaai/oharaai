import type { VaultItem } from '@/types/vault';
import { normalizeSourceUrl, SOURCE_MAX_BYTES, sourceExtension } from './source-domain.ts';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PROVIDERS = new Set(['upload', 'web_upload', 'ios_files', 'ios_photos', 'link']);
const UNSAFE_EXTENSIONS = new Set(['apk', 'app', 'bat', 'cmd', 'com', 'dll', 'dmg', 'exe', 'jar', 'msi', 'pkg', 'ps1', 'scr', 'sh']);

export function sanitizeSourceId(input: unknown): string | undefined {
  if (input === undefined || input === null) return undefined;
  if (typeof input !== 'string' || !UUID_PATTERN.test(input)) throw new Error('Invalid Source ID');
  return input.toLowerCase();
}

export function sanitizeSourceMetadata(
  input: unknown,
  args: { itemType: 'link' | 'document' | 'image'; sourceId?: string; userId: string },
): VaultItem['metadata'] {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Source metadata is required');
  const value = input as Record<string, unknown>;
  const provider = typeof value.provider === 'string' ? value.provider : args.itemType === 'link' ? 'link' : 'upload';
  if (!PROVIDERS.has(provider)) throw new Error('Invalid Source provider');

  const annotation = typeof value.annotation === 'string' ? value.annotation.trim().slice(0, 2000) || undefined : undefined;
  if (args.itemType === 'link') {
    if (provider !== 'link') throw new Error('Invalid link provider');
    const url = normalizeSourceUrl(typeof value.url === 'string' ? value.url : '');
    return { annotation, provider: 'link', url };
  }

  if (!args.sourceId) throw new Error('Uploaded Sources require a Source ID');
  const storagePath = typeof value.storagePath === 'string' ? value.storagePath.trim() : '';
  const expectedPrefix = `${args.userId}/${args.sourceId}/`;
  if (!storagePath.startsWith(expectedPrefix) || storagePath.includes('..')) throw new Error('Invalid Source storage path');
  const fileName = typeof value.fileName === 'string' ? value.fileName.trim().slice(0, 180) : '';
  if (!fileName || fileName.includes('/') || fileName.includes('\\')) throw new Error('Invalid Source filename');
  if (storagePath !== `${expectedPrefix}${fileName}`) throw new Error('Source path and filename do not match');
  if (UNSAFE_EXTENSIONS.has(sourceExtension(fileName))) throw new Error('This file type cannot be uploaded to OHARA.');
  const fileSize = typeof value.fileSize === 'number' && Number.isFinite(value.fileSize) ? Math.round(value.fileSize) : 0;
  if (fileSize < 0 || fileSize > SOURCE_MAX_BYTES) throw new Error('This file is too large to upload.');
  const mimeType = typeof value.mimeType === 'string' ? value.mimeType.trim().toLowerCase().slice(0, 160) : 'application/octet-stream';
  if (/x-msdownload|x-executable|x-sh|java-archive/i.test(mimeType)) throw new Error('This file type cannot be uploaded to OHARA.');
  const dimension = (candidate: unknown): number | undefined => typeof candidate === 'number' && Number.isFinite(candidate) && candidate > 0 ? Math.round(candidate) : undefined;
  return {
    annotation,
    fileName,
    fileSize,
    fileType: typeof value.fileType === 'string' ? value.fileType.trim().toLowerCase().slice(0, 32) : undefined,
    height: dimension(value.height),
    mimeType,
    provider: provider as VaultItem['metadata']['provider'],
    storagePath,
    width: dimension(value.width),
  };
}
