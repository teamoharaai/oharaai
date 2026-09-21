# Sticky Note Folders — Implementation Plan

_Branch: `sticky-notes-folders` · Status: BUILT (phases 1–4 + tweaks), migrations 065 & 066 APPLIED live 2026-09-21 · Author: Claude (2026-09-21)_

**Post-build additions (2026-09-21):**
- Folder Rename/Delete moved under a recycled `OverflowMenu` (⋯); also hosts
  **Move left/right** reordering.
- **Note search** — client-side title+body filter over the active folder view
  (pure helpers in `features/goals/sticky-notes-folders.ts`).
- **Folder reordering** wires the previously-unused `sort_order` via
  `POST /api/vaults/[goalId]/reorder-folders` (kept out of the `/folders/`
  subtree to avoid the `[folderId]` route collision).
- **Migration 066** hardens `vault_note_folders` INSERT/UPDATE to also require
  ownership of the referenced vault (folders can only live in a vault you own).
- Tests: RLS harness `scripts/test-sticky-note-folders-security.sh`
  (`npm run test:sticky-folders:db`) + unit tests
  `features/goals/sticky-notes-folders.test.ts`.

## 1. Goal

Let a user organize a goal's **Sticky Notes** into named **folders**. Today all of a
goal's notes render as one flat, newest-first list in `StickyNotesPanel`. As notes
accumulate this becomes unusable. Folders add a lightweight grouping layer —
create/rename/delete folders, assign notes to a folder, and filter the list by
folder — modeled on the existing Echo Folders feature but scoped to the goal.

Non-goals (this pass): nested/sub-folders, drag-and-drop reorder, folder colors,
sharing folders through Circles, folders over non-note vault items.

## 2. Current state (what already exists)

- Sticky notes are **Vault items**: `vault_items` rows with `item_type='note'`,
  one vault per goal (migration 062 unified the old `goal_notes` table into the
  Vault; `goal_notes` is frozen/read-only).
- Domain type `GoalNote` (`features/goals/types.ts`): `id, goalId, userId, title,
  body, photoUrl, createdAt, updatedAt`.
- Data path (all through the `/api/vaults` chokepoint so embeddings stay
  server-side):
  - Read: `fetchGoalVaultNotes(goalId)` → `GET /api/vaults/{goalId}` → filter
    `itemType==='note'` → `mapVaultNoteToGoalNote`.
  - Write: `createGoalNote` (POST `/api/vaults/{goalId}`), `updateGoalNote`
    (PUT `/api/vaults/items/{id}`), `deleteGoalNote` (DELETE `/api/vaults/items/{id}`).
  - `useGoalDetail` loads notes into the goal store; `StickyNotesPanel`
    (`embedded`) renders them inside `GoalVault`'s `privateNotes` slot.
- Precedent: **Echo Folders** — `echo_folders` (user-scoped, `is_general` flag),
  `lib/db/echo-folders.ts`, `app/api/folders/**`, delete RPCs
  (`delete_folder_reassign`, `delete_folder_with_contents`),
  `MoveEntryModal` / `GoalFolderPicker` UI.

## 3. Key design decisions

**D1 — Folders are scoped to a goal's Vault, not per-user.** _(Recommended;
pending final confirmation.)_ A sticky note is goal-bound — it lives in exactly
one goal's vault (`vault_items.vault_id`) and cannot move between goals. So the
choice is really between two different primitives:

- **Per-goal (recommended):** a folder is a sub-grouping *inside* one goal's
  vault (`vault_note_folders.vault_id → vaults.id`); a note's `folder_id` must
  point to a folder in its own vault. Folder boundary == note boundary == goal
  boundary, so everything lines up: the panel (already rendered per-goal) only
  ever shows this goal's folders, lists stay short and contextual, and
  delete-folder-reassign stays inside one vault (clean FK `ON DELETE SET NULL`).
  Cost: no shared taxonomy across goals and no cross-goal "all Research notes"
  view.
- **Per-user (Echo's model):** `note_folders.user_id`, no vault binding; one
  folder spans many goals. This is effectively a **cross-cutting tag/label**
  over goal-bound notes, not folders-within-a-goal. Buys a shared taxonomy and a
  future cross-goal browser, but: (1) semantics clash inside goal detail (a
  folder can be empty for this goal, full for another; "filter by Research" is
  ambiguous); (2) it changes the primitive and rubs against the constitution's
  "everything tied to a goal / no free-floating notes"; (3) the payoff (a
  cross-goal notes view) has no UI surface today, so it'd be a partial dead-end.

Chosen: **per-goal**. If a shared taxonomy is wanted later, add a *separate*
labels/tags concept rather than overloading folders — so this choice doesn't
box us in.

**D2 — "General" is the virtual `NULL` bucket, not a row.** A note with no folder
is "General/Unfiled". We do **not** eagerly provision a General folder row (unlike
Echo migration 017). This removes the general-folder machinery entirely.

**D3 — Assignment via a real FK column with `ON DELETE SET NULL`.** Add
`vault_items.folder_id uuid null references vault_note_folders(id) on delete set
null`. Deleting a folder atomically reassigns its notes back to General (null) —
no reassign RPC, no orphan sweep, notes are never destroyed. Indexed for
"notes in folder X" queries. _(Alternative considered: store `metadata.folderId`
in JSONB — avoids a shared-table column but loses the atomic FK reassign and
indexing; rejected.)_

**D4 — Folder assignment reuses the existing item PUT route.** Extend
`PUT /api/vaults/items/{id}` to accept `folderId` (string | null). No new
single-item "move" endpoint. **Bulk move** (multi-select) is supported via a new
`POST /api/vaults/[goalId]/notes/move` taking `{ noteIds: string[], folderId:
string | null }`, validated so every note and the target folder belong to the
caller's vault; applied as one update. Client falls back to N single PUTs only if
needed — the batch route is preferred so a multi-select move is one request.

**D5 — Moderate limits (no hard product cap, guardrails only).** Enforce, in both
the API and the UI: **≤ 30 folders per goal**, folder **name ≤ 40 chars**
(trimmed, non-empty, unique per vault case-insensitively), and **bulk move ≤ 100
notes per request**. These are sanity guardrails to prevent abuse/UI blowups, not
a product-level restriction; easy to raise later in one constant.

## 4. Data model & migration (`065_vault_note_folders.sql`, NOT applied until reviewed)

```sql
create table public.vault_note_folders (
  id         uuid primary key default gen_random_uuid(),
  vault_id   uuid not null references public.vaults(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  name       text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.vault_note_folders enable row level security;
-- owner-scoped CRUD (select/insert/update/delete using user_id = auth.uid())
-- unique folder name per vault (case-insensitive):
create unique index vault_note_folders_vault_name_uniq
  on public.vault_note_folders (vault_id, lower(name));
create index idx_vault_note_folders_vault on public.vault_note_folders (vault_id);
create trigger vault_note_folders_updated_at before update ...
grant select, insert, update, delete on table public.vault_note_folders to authenticated;

-- Assignment column on the shared items table (nullable = General; additive, safe):
alter table public.vault_items
  add column folder_id uuid null references public.vault_note_folders(id) on delete set null;
create index idx_vault_items_folder on public.vault_items (folder_id);
```

RLS note: `vault_note_folders` is owner-scoped by `user_id = auth.uid()`, matching
`goal_notes`/milestones. The `folder_id` FK crosses to a same-owner folder;
enforce in the API layer that the target folder's vault matches the note's vault.

## 5. Server

- **`lib/db/vault-folders.ts`** (new, mirrors `echo-folders.ts` conventions —
  `DbXRow` + `mapX`, optional `client` param):
  `getFoldersForVault(vaultId)`, `createFolder(vaultId, userId, name)`,
  `renameFolder(folderId, name)`, `deleteFolder(folderId)` (plain DELETE; FK
  handles reassignment).
- **`lib/db/vaults.ts`**: add `folder_id` to `DbVaultItemRow`, `mapVaultItem`,
  and `buildVaultItemUpdate` (so `updateVaultItem({ folderId })` works). Add an
  optional `getVaultItemsByType` filter is not needed — folder is client-side filter.
- **API routes** (thin, resolve `userId` from session, get-or-create vault):
  - `app/api/vaults/[goalId]/folders/+api.ts` — `GET` list, `POST` create.
  - `app/api/vaults/[goalId]/folders/[folderId]+api.ts` — `PATCH` rename,
    `DELETE` delete.
  - Extend `app/api/vaults/items/[id]+api.ts` `PUT` to accept `folderId`
    (validate the folder belongs to the same vault, or is null).

## 6. Types (L3 — CEO-owned; flag `types/vault.ts` + `features/goals/types.ts`)

- `types/vault.ts`: add `folderId?: string | null` to `VaultItem`; new
  `VaultNoteFolder { id; vaultId; userId; name; sortOrder; createdAt; updatedAt }`.
- `features/goals/types.ts`: `GoalNote` gains `folderId: string | null`;
  `GoalNoteUpdates` gains `folderId?: string | null`; new domain
  `GoalNoteFolder { id; goalId; name; createdAt }`. (`GoalNoteInput` optionally
  gains `folderId` so a note can be created directly into the active folder.)

## 7. Client / feature layer

- **`goal-service.ts`**: map `folderId` in `mapVaultNoteToGoalNote`; thread
  `folderId` through `createGoalNote`/`updateGoalNote`. Add
  `fetchGoalNoteFolders(goalId)`, `createGoalNoteFolder(goalId, name)`,
  `renameGoalNoteFolder(goalId, folderId, name)`,
  `deleteGoalNoteFolder(goalId, folderId)`.
- **`store.ts` + `useGoalDetail`**: hold `noteFolders` per goal alongside notes;
  add handlers `onAddNoteFolder`, `onRenameNoteFolder`, `onDeleteNoteFolder`,
  `onMoveNote(noteId, folderId)`, with optimistic update + error surface
  matching the existing note handlers.

## 8. UI / UX (`StickyNotesPanel`)

- **Folder bar** at the top of the panel: horizontal chips —
  `All` · `General` · [user folders…] · `+ New folder`. Selecting a chip filters
  the note list (client-side by `folderId`; `All` = no filter, `General` =
  `folderId == null`). Active chip uses `background.selectedRow` / accent.
- **Per-note "Move to folder"** added to the existing `OverflowMenu` actions
  (Edit / Move / Add photo / Delete) — opens a small folder picker
  (reuse the `AnchoredPopover`/`OverflowMenu` idiom; cf. `GoalFolderPicker`).
- **Bulk multi-select move**: a "Select" affordance on the panel toggles
  selection mode; note cards show checkboxes, a selection action bar appears
  ("N selected · Move to… · Cancel"), and choosing a folder calls the batch
  move route (D4). Selection state is local to the panel; clears after a move.
  Capped at 100 notes per request (D5).
- **Folder rename/delete**: overflow on the active folder chip. Delete confirms
  ("Delete folder? Its notes move to General.") via the shared `Modal`
  confirm/cancel API.
- **Empty states**: empty folder → "No notes in this folder yet"; keep the
  existing zero-notes copy for a goal with no notes at all.
- **New-note default**: a note created while a user folder is active is created
  into that folder (`GoalNoteInput.folderId`); in `All`/`General` it lands in
  General.
- `readOnly` (successor/complete/archived goals) hides all folder authoring, as
  it already hides note authoring.

## 9. Build phases

1. **DB + types**: migration 065 (written, not applied), `types/vault.ts`,
   `features/goals/types.ts`. `tsc` green.
2. **Server**: `lib/db/vault-folders.ts`, `vaults.ts` column plumbing, API routes.
3. **Service + store**: `goal-service.ts` folder fns + `folderId` threading,
   store/`useGoalDetail` handlers.
4. **UI**: folder bar, move-to-folder, rename/delete, empty states in
   `StickyNotesPanel`.
5. **Apply migration 065** (mgmt API per `ref_supabase_migration_apply`) once the
   above is reviewed; bump `supabase/CLAUDE.md` "next migration" pointer past 065.

Phases 1–4 are shippable behind the existing UI with an empty folder set (all
notes are General) before the migration is applied — folder reads just return [].

## 10. Testing / validation

- `npx tsc --noEmit` green before and after each phase (hard gate).
- Unit: folder filter/selection logic in the panel; `mapVaultNoteToGoalNote`
  folderId mapping.
- DB security harness in the style of `scripts/test-*-security.sh` for
  `vault_note_folders` RLS (owner isolation) and `folder_id` cross-vault guard.
- Manual QA on localhost (:8081): create/rename/delete folders, move notes,
  filter, delete-folder-reassigns-to-General, readOnly goal hides authoring.

## 11. Decisions & open questions

- **Q1 (D1) — OPEN, recommend per-goal:** elaboration in D1. Per-goal matches the
  note↔goal boundary and ships a complete feature; per-user is really a
  cross-cutting tag whose payoff (cross-goal view) has no UI yet. Awaiting final
  confirmation before building the data model.
- **Q2 — RESOLVED:** yes to bulk multi-select move (D4 batch route + D5 cap of
  100; UI in §8).
- **Q3 — RESOLVED:** no hard product cap; moderate guardrails only — ≤ 30
  folders/goal, 40-char names, ≤ 100 notes/bulk-move (D5).
