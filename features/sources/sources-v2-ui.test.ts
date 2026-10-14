import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const source = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');
const composer = source('features/sources/components/SourceComposer.tsx');
const service = source('features/sources/source-service.ts');
const vault = source('features/goals/components/GoalVault.tsx');
const sourceCard = source('features/goals/components/VaultItemCard.tsx');
const notes = source('features/entries/components/NotesLibraryScreen.tsx');
const app = source('app.json');
const migration = source('supabase/migrations/091_sources_v2.sql');
const itemRoute = source('app/api/vaults/items/[itemId]+api.ts');

test('Add Source offers only the approved file, image, and link choices', () => {
  for (const label of ['File', 'Photo or Image', 'Link']) assert.match(composer, new RegExp(`title: '${label}'`));
  assert.doesNotMatch(composer, /Google Drive|Dropbox|OneDrive|scanner|citation/i);
});

test('native selection imports bytes into private OHARA storage', () => {
  assert.match(service, /DocumentPicker\.getDocumentAsync/);
  assert.match(service, /ImagePicker\.launchImageLibraryAsync/);
  assert.match(service, /copyToCacheDirectory: true/);
  assert.match(service, /storage\.from\(SOURCE_BUCKET\)\.upload/);
  assert.match(service, /storage\.from\(SOURCE_BUCKET\)\.remove/);
  assert.doesNotMatch(service, /provider:\s*'google_drive'/);
});

test('iOS permissions are picker-scoped and native plugins are configured', () => {
  assert.match(service, /requestMediaLibraryPermissionsAsync/);
  assert.match(app, /expo-document-picker/);
  assert.match(app, /expo-image-picker/);
  assert.match(app, /Allow OHARA to import a photo you choose/);
});

test('Project and Goal Vaults expose compact Source types and Notes remains federated', () => {
  for (const label of ['Files', 'Images', 'Links']) assert.match(vault, new RegExp(`'${label}'`));
  assert.match(notes, /context=\{\{ kind: 'personal' \}\}/);
  assert.match(notes, /getSourceAccessUrl/);
  assert.match(notes, /Search Sources/);
});

test('Source management stays creator-only while authorized viewing remains available', () => {
  assert.match(vault, /viewerId === selectedSource\.createdBy/);
  assert.match(sourceCard, /canManageSource \? editing/);
  assert.match(sourceCard, /Open Link/);
  assert.match(sourceCard, /Delete Source/);
});

test('private storage authorization is joined to canonical Source visibility', () => {
  assert.match(migration, /public = excluded\.public/);
  assert.match(migration, /vi\.metadata->>'storagePath' = storage\.objects\.name/);
  assert.match(migration, /vi\.visibility = 'vault_members'/);
  assert.match(migration, /is_project_member_v11/);
  assert.match(migration, /preserve_departing_member_sources_v2/);
  assert.match(migration, /preserve_sources_before_vault_delete_v2/);
  assert.match(itemRoute, /existingItem\.createdBy !== auth\.userId/);
  assert.match(itemRoute, /createServiceRoleClient\(\)/);
  assert.match(itemRoute, /deleteVaultItem[\s\S]+storageDb\.storage\.from\(SOURCE_BUCKET\)\.remove/);
});
