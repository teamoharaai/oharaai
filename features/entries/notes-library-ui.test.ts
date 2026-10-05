import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), 'utf8');
}

const library = source('features/entries/components/NotesLibraryScreen.tsx');
const selection = source('features/entries/notes-library.ts');
const libraryApi = source('app/api/notes/library+api.ts');
const libraryDb = source('lib/db/notes-library.ts');
const folderApi = source('app/api/notes/folders+api.ts');
const migration = source('supabase/migrations/087_notes_library_folders.sql');
const noteRoute = source('app/(app)/notes/[id].tsx');
const noteEditor = source('features/entries/components/NoteEditor.tsx');
const uiStore = source('store/uiStore.ts');

test('Notes library exposes the approved information architecture and terminology', () => {
  assert.match(library, /My Library/);
  assert.match(library, /Shared with Me/);
  assert.match(library, /id: 'linked-to', label: 'Linked'/);
  assert.doesNotMatch(library, /id: 'linked-to', label: 'Linked to'/);
  assert.match(library, /Sources/);
  assert.doesNotMatch(library, /Connected/);
  assert.match(library, /Search Notes/);
  assert.match(library, /Sort Notes/);
  assert.match(library, /Filters/);
  assert.match(library, /DATE UPDATED/);
  assert.match(library, /All Notes/);
  assert.match(library, /Unfiled/);
});

test('library tabs are client projections over one viewer-authorized payload', () => {
  assert.match(libraryApi, /getNotesLibrary/);
  assert.match(libraryDb, /\.eq\('entry_type', 'note'\)/);
  const noteProjectionQuery = libraryDb.slice(
    libraryDb.indexOf("const { data, error } = await db.from('entries')"),
    libraryDb.indexOf('if (error) throw error', libraryDb.indexOf("const { data, error } = await db.from('entries')")),
  );
  assert.doesNotMatch(noteProjectionQuery, /\.eq\('user_id', viewerId\)/);
  assert.match(selection, /args\.view === 'my-library'/);
  assert.match(selection, /args\.view === 'shared-with-me'/);
  assert.match(selection, /args\.view === 'linked-to'/);
  assert.match(libraryDb, /db\.from\('echo_entries'\)\.select\('id'\)/);
  assert.match(libraryDb, /deriveEntryCapabilities\([\s\S]*echoOwnedIds\.has\(row\.id\)/);
});

test('Sources are federated from authorized Vault documents and links only', () => {
  assert.match(libraryDb, /\.in\('item_type', \['link', 'document'\]\)/);
  assert.match(libraryDb, /\.neq\('content_kind', 'sticky_note'\)/);
  assert.match(libraryDb, /vault\.project_id \?\? goalRow\?\.project_id/);
});

test('personal folders never mutate sharing and deletion returns Notes to Unfiled', () => {
  assert.match(migration, /primary key \(user_id, entry_id\)/);
  assert.match(migration, /references public\.note_folders\(id, user_id\) on delete cascade/);
  assert.match(migration, /references public\.entries\(id\) on delete cascade/);
  assert.doesNotMatch(migration, /alter table public\.entries[\s\S]*folder/);
  assert.match(folderApi, /note_folder_assignments/);
  assert.doesNotMatch(folderApi, /project_share_scope|entry_goal_links/);
  assert.match(library, /Notes in this folder will move to Unfiled\. No Notes will be deleted\./);
});

test('full-screen Note workspace stays canonical and Echo starts closed', () => {
  assert.match(noteRoute, /EntryDetailScreen/);
  assert.match(noteRoute, /goalWorkspaceHref/);
  assert.match(noteRoute, /projects\/\$\{projectId\}/);
  assert.match(uiStore, /entriesIntelligenceOpen: false/);
  assert.match(noteEditor, /setIntelligenceOpen\(false\)/);
});
