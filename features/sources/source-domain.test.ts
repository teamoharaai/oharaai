import assert from 'node:assert/strict';
import test from 'node:test';
import {
  formatSourceBytes,
  normalizeSourceUrl,
  resolveSourceMimeType,
  sanitizeSourceFileName,
  SOURCE_MAX_BYTES,
  validateSourceAsset,
} from './source-domain.ts';
import { sanitizeSourceId, sanitizeSourceMetadata } from './source-server.ts';

const userId = '91000000-0000-4000-8000-000000000001';
const sourceId = '93000000-0000-4000-8000-000000000001';

test('normalizes safe links and rejects non-web protocols', () => {
  assert.equal(normalizeSourceUrl('example.com/path'), 'https://example.com/path');
  assert.throws(() => normalizeSourceUrl('javascript:alert(1)'), /valid web address/);
});

test('sanitizes filenames and derives common MIME types', () => {
  assert.equal(sanitizeSourceFileName('../Launch / Plan.PDF'), '..-Launch - Plan.PDF');
  assert.equal(resolveSourceMimeType('plan.docx', null), 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
  assert.equal(resolveSourceMimeType('photo.heic', 'application/octet-stream'), 'image/heic');
});

test('enforces the Sources upload boundary', () => {
  assert.doesNotThrow(() => validateSourceAsset({ fileName: 'brief.pdf', fileSize: SOURCE_MAX_BYTES, mimeType: 'application/pdf' }));
  assert.throws(() => validateSourceAsset({ fileName: 'brief.pdf', fileSize: SOURCE_MAX_BYTES + 1, mimeType: 'application/pdf' }), /too large/);
  assert.throws(() => validateSourceAsset({ fileName: 'installer.exe', fileSize: 10, mimeType: 'application/octet-stream' }), /cannot be uploaded/);
  assert.equal(formatSourceBytes(2_621_440), '2.5 MB');
});

test('server metadata binds uploaded paths to authenticated creator and Source ID', () => {
  assert.equal(sanitizeSourceId(sourceId), sourceId);
  const metadata = sanitizeSourceMetadata({
    provider: 'ios_files', storagePath: `${userId}/${sourceId}/Research.pdf`, fileName: 'Research.pdf',
    mimeType: 'application/pdf', fileSize: 1024,
  }, { itemType: 'document', sourceId, userId });
  assert.equal(metadata.storagePath, `${userId}/${sourceId}/Research.pdf`);
  assert.throws(() => sanitizeSourceMetadata({
    provider: 'ios_files', storagePath: `someone-else/${sourceId}/Research.pdf`, fileName: 'Research.pdf', fileSize: 1,
  }, { itemType: 'document', sourceId, userId }), /storage path/);
});

test('link metadata remains lightweight and canonical', () => {
  const metadata = sanitizeSourceMetadata({ provider: 'link', url: 'openai.com/research', annotation: 'Reference' }, { itemType: 'link', userId });
  assert.equal(metadata.url, 'https://openai.com/research');
  assert.equal(metadata.provider, 'link');
  assert.equal(metadata.annotation, 'Reference');
});
