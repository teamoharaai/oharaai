import type { SourceProvider, VaultItem, VaultItemType } from '@/types/vault';

export const SOURCE_BUCKET = 'sources';
export const SOURCE_MAX_BYTES = 25 * 1024 * 1024;

const UNSAFE_EXTENSIONS = new Set([
  'apk', 'app', 'bat', 'cmd', 'com', 'dll', 'dmg', 'exe', 'jar', 'msi', 'pkg', 'ps1', 'scr', 'sh',
]);

const MIME_BY_EXTENSION: Record<string, string> = {
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  heic: 'image/heic',
  heif: 'image/heif',
  jpeg: 'image/jpeg',
  jpg: 'image/jpeg',
  md: 'text/markdown',
  pdf: 'application/pdf',
  png: 'image/png',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  txt: 'text/plain',
  webp: 'image/webp',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
};

export type SourceAsset = {
  uri: string;
  file?: Blob & { name?: string };
  fileName: string;
  mimeType: string;
  fileSize: number;
  width?: number;
  height?: number;
  provider: Extract<SourceProvider, 'web_upload' | 'ios_files' | 'ios_photos'>;
  sourceType: Extract<VaultItemType, 'document' | 'image'>;
};

export function sourceExtension(fileName: string): string {
  return fileName.split('.').pop()?.trim().toLowerCase().replace(/[^a-z0-9]/g, '') ?? '';
}

export function sanitizeSourceFileName(fileName: string): string {
  const cleaned = fileName
    .normalize('NFKC')
    .replace(/[\\/\0\x01-\x1f\x7f]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 180);
  return cleaned || 'Source file';
}

export function resolveSourceMimeType(fileName: string, mimeType?: string | null): string {
  const normalized = mimeType?.trim().toLowerCase();
  if (normalized && normalized !== 'application/octet-stream') return normalized;
  return MIME_BY_EXTENSION[sourceExtension(fileName)] ?? normalized ?? 'application/octet-stream';
}

export function validateSourceAsset(asset: Pick<SourceAsset, 'fileName' | 'fileSize' | 'mimeType'>): void {
  if (!Number.isFinite(asset.fileSize) || asset.fileSize < 0) throw new Error('This file could not be read.');
  if (asset.fileSize > SOURCE_MAX_BYTES) throw new Error('This file is too large to upload. Choose a file that is 25 MB or smaller.');
  const extension = sourceExtension(asset.fileName);
  if (UNSAFE_EXTENSIONS.has(extension)) throw new Error('This file type cannot be uploaded to OHARA.');
  if (/x-msdownload|x-executable|x-sh|java-archive/i.test(asset.mimeType)) {
    throw new Error('This file type cannot be uploaded to OHARA.');
  }
}

export function normalizeSourceUrl(value: string): string {
  const candidate = /^https?:\/\//i.test(value.trim()) ? value.trim() : `https://${value.trim()}`;
  let parsed: URL;
  try { parsed = new URL(candidate); } catch { throw new Error('Enter a valid web address.'); }
  if (!['http:', 'https:'].includes(parsed.protocol) || !parsed.hostname) throw new Error('Enter a valid web address.');
  return parsed.toString();
}

export function sourceDomain(url: string | undefined): string {
  if (!url) return '';
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return ''; }
}

export function formatSourceBytes(value: number | undefined): string {
  if (!value || value < 1) return '';
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`;
  return `${(value / (1024 * 1024)).toFixed(value >= 10 * 1024 * 1024 ? 0 : 1)} MB`;
}

export function isUploadedSource(item: Pick<VaultItem, 'itemType' | 'metadata'>): boolean {
  return (item.itemType === 'document' || item.itemType === 'image') && Boolean(item.metadata?.storagePath);
}
