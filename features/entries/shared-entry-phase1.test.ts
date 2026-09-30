import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import { databaseErrorMessage, isEntryConflictError } from './conflict.ts';

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), 'utf8');
}

const detailRoute = source('app/api/entries/library/[id]+api.ts');
const entriesDb = source('lib/db/entries.ts');
const types = source('features/entries/types.ts');
const detailScreen = source('features/entries/components/EntryDetailScreen.tsx');
const sharedView = source('features/entries/components/SharedEntryReadView.tsx');
const webEditor = source('features/entries/components/RichTextEditor.web.tsx');
const noteRoute = source('app/(app)/notes/[id].tsx');
const reflectionRoute = source('app/(app)/reflections/[id].tsx');
const noteEditor = source('features/entries/components/NoteEditor.tsx');
const reflectionEditor = source('features/entries/components/QuickReflectionEditor.tsx');
const avatarMenu = source('components/layout/AvatarMenu.tsx');
const invitePane = source('features/circles/components/GoalInvitesPane.tsx');
const migration = source('supabase/migrations/082_shared_entry_reliability.sql');

test('Entry detail v1 is RLS-authorized by ID and derives owner-only mutations', () => {
  const getDetail = entriesDb.slice(
    entriesDb.indexOf('export async function getEntryDetail'),
    entriesDb.indexOf('const entryReadMs', entriesDb.indexOf('export async function getEntryDetail')),
  );
  assert.match(types, /version: 'entry-detail\.v1'/);
  assert.match(getDetail, /\.eq\('id', entryId\)/);
  assert.doesNotMatch(getDetail, /\.eq\('user_id', viewerId\)/);
  assert.match(entriesDb, /const isOwner = viewerId === ownerId/);
  assert.match(entriesDb, /canEdit: isOwner/);
  assert.match(entriesDb, /canDelete: isOwner/);
  assert.match(entriesDb, /canChangeShare: isOwner/);
});

test('canonical read response is minimal, private, timed, and metadata-tolerant', () => {
  assert.match(detailRoute, /Cache-Control': 'private, no-store'/);
  assert.match(detailRoute, /X-Request-ID/);
  assert.match(detailRoute, /Server-Timing/);
  assert.match(detailRoute, /Author metadata is optional/);
  assert.match(entriesDb, /Project collaborator/);
  assert.doesNotMatch(detailRoute, /plainText|content:/);
});

test('direct Notes and Reflections routes do not mount owner libraries or optional AI services', () => {
  for (const route of [noteRoute, reflectionRoute]) {
    assert.match(route, /EntryDetailScreen/);
    assert.doesNotMatch(route, /EntriesScreen|ReflectionsScreen|Echo|Momentum|useCirclesStore|useFriends/);
  }
  assert.match(detailScreen, /fetchEntryDetail/);
  assert.match(detailScreen, /SharedEntryReadView/);
  assert.doesNotMatch(detailScreen + sharedView, /Echo|Momentum|useCirclesStore|useFriends/);
});

test('collaborator renderer preserves rich content and removes mutation controls', () => {
  assert.match(sharedView, /readOnly/);
  assert.match(sharedView, /View only/);
  assert.match(sharedView, /Shared via/);
  assert.match(webEditor, /editable: !readOnly/);
  assert.match(webEditor, /aria-readonly/);
  assert.match(webEditor, /readOnly \? null : <div className="ohara-editor-toolbar"/);
});

test('plain Supabase conflict objects are recognized as HTTP conflicts', () => {
  const conflict = { message: 'Entry changed in another session. Reload before saving.' };
  assert.equal(databaseErrorMessage(conflict), conflict.message);
  assert.equal(isEntryConflictError(conflict), true);
  assert.equal(isEntryConflictError(new Error('Other failure')), false);
  assert.match(detailRoute, /status: 409/);
});

test('Note and quick Reflection autosave serialize overlap and preserve newer drafts', () => {
  for (const editor of [noteEditor, reflectionEditor]) {
    assert.match(editor, /requestedSaveVersionRef\.current = Math\.max/);
    assert.match(editor, /if \(savePromiseRef\.current\)/);
    assert.match(editor, /while \(requestedSaveVersionRef\.current > lastSavedVersion\.current\)/);
    assert.match(editor, /expectedContentVersion: contentVersionRef\.current/);
    assert.match(editor, /latestDirtyVersionRef\.current <= savingVersion/);
    assert.match(editor, /expectedContentVersion: saved\.contentVersion/);
  }
});

test('social graph hydration is lazy and the closed Friends popover is unmounted', () => {
  assert.match(invitePane, /useGoalInviteCount\(enabled = true\)/);
  assert.match(invitePane, /FEATURES\.CIRCLES_ENABLED && enabled/);
  assert.match(avatarMenu, /useGoalInviteCount\([\s\S]*menuOpen/);
  assert.match(avatarMenu, /FEATURES\.SOCIAL_ENABLED && friendsOpen/);
});

test('shared Note images follow Entry RLS and active Project Entries have a supporting index', () => {
  assert.match(migration, /entries_project_active_updated_idx/);
  assert.match(migration, /on public\.entries \(project_id, updated_at desc\)[\s\S]*where archived = false/);
  assert.match(migration, /Project collaborators can read shared note images/);
  assert.match(migration, /e\.id::text = \(storage\.foldername\(name\)\)\[2\]/);
  assert.match(migration, /e\.user_id::text = \(storage\.foldername\(name\)\)\[1\]/);
  assert.doesNotMatch(migration, /for insert|for update|for delete/);
});
