# Ohara Codex Changelog

## [Unreleased]

### Changed (2026-07-11 — Session 7: Echo composer internal editor layout)
- **`features/echo/components/EchoComposer.tsx`:** redesigned the inline right-pane composer
  around a combined title/body editor panel with a larger flexing plain-text body area, while
  preserving the existing mount path, `Link a goal` picker integration, draft/link state, and
  save payload contract. Removed the inactive attachment affordance so the composer remains a
  plain-text entry surface.
- Verification: `npx tsc --noEmit` clean.

### Changed (2026-07-11 — Follow-up: add Echo tree view and loosen pane resizing)
- **`features/echo/components/EchoContainerTree.tsx` (new) and `EchoScreen.tsx`:** added a
  middle-pane tree toggle beside the filter pill, showing folders and project-grouped goals as
  selectable scope targets in the main Echo column.
- **`features/echo/components/EchoScreen.tsx`:** loosened the right-pane resize clamp
  (`280px` detail minimum, `220px` middle-column floor) so the divider can travel farther
  left and right.
- **`features/echo/components/EchoEntryList.tsx`:** moved the entry list rail onto the same
  warm page background so short entry lists do not leave awkward blocks of mismatched color.
- Verification: `npx tsc --noEmit` clean.

### Changed (2026-07-11 — Follow-up: extend Echo entry list rail)
- **`features/echo/components/EchoEntryList.tsx` and `EchoEntryRow.tsx`:** changed the entry
  list from content-height-feeling rows into a full-height vertical list rail with
  full-width entry bands, so a single entry no longer reads as a small isolated tile.
- Verification: `npx tsc --noEmit` clean.

### Changed (2026-07-11 — Follow-up: remove Echo detail collapse arrow)
- **`features/echo/components/EchoPaneResizer.tsx` and `EchoScreen.tsx`:** removed the
  right-pane collapse/expand arrow and docked strip behavior, leaving only the draggable
  vertical resizer between the entry list and detail view.
- **`store/uiStore.ts` and `store/clearAllStores.ts`:** removed the now-unused persisted
  `rightPaneCollapsed` preference so stale collapsed state cannot trap the detail pane.
- Verification: `npx tsc --noEmit` clean.

### Changed (2026-07-11 — Phase 5: scoped flat Echo list)
- **`features/echo/components/EchoScreen.tsx`:** selecting a canonical goal/folder filter now
  filters the already-loaded entries by `goalId` or `folderId`, clears the active detail, and
  switches the list from date-grouped mode to flat scoped mode.
- **`features/echo/components/EchoEntryList.tsx` and `EchoEntryRow.tsx`:** flat scoped mode
  hides date headers, uses date captions, and switches rows to the titles-only variant while
  retaining the same selected-row and action-menu behavior.
- Verification: `npx tsc --noEmit` clean. Live smoke for scoped filtering, empty scoped
  containers, and restoring All/date grouping still needs a real signed-in dev-server session.

### Changed (2026-07-11 — Phase 4: right detail/composer pane and persisted resize)
- **`features/echo/components/EchoComposer.tsx` (new):** moved the new-entry form into the
  right pane, preserving body draft persistence and save-result handling while submitting
  through the existing `saveEntry(text, goalId|null, aiRequested, brt, emotion, title)`
  contract. The composer uses `GoalFolderPicker` in goal-only mode because the create path
  still cannot persist an arbitrary folder id without changing that contract.
- **`features/echo/components/EchoDetailPane.tsx` (new):** added empty, read-only entry, and
  add/composer states with resolved container/date captions and neutral-grey null-BRT dots.
- **`features/echo/components/EchoPaneResizer.tsx` (new), `store/uiStore.ts`,
  `store/clearAllStores.ts`:** added right-pane resize/collapse controls plus persisted
  `rightPaneWidth` and `rightPaneCollapsed`, including the `partialize` whitelist.
- **`features/echo/components/EchoScreen.tsx`, `features/echo/hooks/useEntries.ts`,
  `features/echo/components/GoalFolderPicker.tsx`:** wired three-pane orchestration,
  add/view selection state, route-goal draft restoration, and goal-only picker mode for the
  composer.
- Verification: `npx tsc --noEmit` clean. Live smoke for composer save, row detail view,
  resize clamps, and width/collapse refresh persistence still needs a real signed-in
  dev-server session/JWT.

### Changed (2026-07-11 — Phase 3: shared Goal/Folder picker)
- **`features/echo/components/GoalFolderPicker.tsx` (new):** added the reusable two-section
  container picker: goals grouped under project headers with an explicit Ungrouped group,
  plus flat Echo folders including General as a normal selectable folder.
- **`features/echo/components/MoveEntryModal.tsx`:** replaced the old inline
  "Projects"/folders list with `GoalFolderPicker`, correcting the goal section label to
  "Goals" while preserving the existing single-row move path through `onConfirm`.
- Verification: `npx tsc --noEmit` clean. Live move/write smoke for goal and folder targets,
  including General and one-confirmed-row behavior, still needs a real signed-in dev-server
  session/JWT.

### Changed (2026-07-11 — Phase 2: date-grouped Echo list and canonical filter)
- **`features/echo/services/echo-service.ts`, `features/echo/hooks/useEntries.ts`,
  `features/echo/types.ts`, `features/echo/store.ts`, `features/echo/hooks/useMoveEntry.ts`:**
  threaded canonical goal/folder options into the Echo screen and preserved folder ids on
  confirmed folder links so later scoped filtering can use stable ids.
- **`features/echo/components/EchoEntryRow.tsx`, `EchoEntryList.tsx`,
  `EchoFilterPill.tsx` (new):** added the Phase 2 middle-column list surface with date
  grouping, BRT dots, selected-row styling, container/date captions, action-menu carryover,
  loading/empty states, and the canonical filter dropdown.
- **`features/echo/components/EchoScreen.tsx`:** replaced the old single-scroll
  composer-on-top screen with the Phase 2 list column plus placeholder detail column.
- Verification: `npx tsc --noEmit` clean. Live render smoke for grouping/dots/dropdown still
  needs a real signed-in dev-server session.

### Changed (2026-07-11 — Phase 0: canonical BRT resolver)
- **`lib/utils/resolveBrt.ts` (new):** added the canonical dominant-BRT resolver over
  `EchoBrt`, using count majority with lowercase category output. The original commit
  (7f95880) shipped an unauthorized thorn -> rose -> bud tie-break; this has since been
  reverted to bud -> rose -> thorn, matching the tie-break behavior of the three prior
  resolver implementations it replaced. No decision record ever authorized thorn-first.
  The "real" canonical tie-break philosophy is an open product decision for Ariel, to be
  recorded separately in DECISIONS.md — bud-first here is a safe-default revert, not that
  decision.
- **`features/goals/services/goal-service.ts`:** retired the local `deriveBrtTag`
  first-non-empty heuristic and now uses `resolveBrt()` for goal-card BRT signal tags.
- **`features/goals/hooks/useEchoTrail.ts` and `components/ui/ReflectionCard.tsx`:**
  removed local title-case dominant-BRT mirrors and title-case the canonical lowercase
  category at the UI boundary.
- Verification: `npx tsc --noEmit` clean. Live smoke for EchoTrail labels, goal-card
  dots, and ReflectionCard labels still requires a real signed-in dev-server session.

### Added (2026-07-11 — Phase 1: Echo redesign color tokens)
- **`constants/colors.ts`:** added the locked Echo redesign tokens only:
  `LIGHT_THEME.brt.{bud,rose,thorn}`, `LIGHT_THEME.border.input`,
  `LIGHT_THEME.border.divider`, and `LIGHT_THEME.background.selectedRow`.
- Verification: `npx tsc --noEmit` clean.

### Added (2026-07-10 — Log the intentional embedding-skip in PATCH /api/entries/:id)
- **Context:** a live audit flagged `echo_entries.embedding_text` as null after a content-changing
  edit. Root cause was benign: `buildEchoEmbeddingText` returns null when content falls under
  `EMBEDDING_MIN_WORD_COUNT` (40 words), so the PATCH handler correctly clears `embedding_text`
  and the vector. Not a regression — the re-embed is awaited and its failure path is already
  logged; the confusion was that the *by-design* null had no log line, so it looked like a
  swallowed failure.
- **`app/api/entries/[id]+api.ts`:** in the `contentChanged` block, when `embeddingText` is null,
  emit `console.debug({ event: 'embedding_skipped', reason: 'below_min_word_count', record_id,
  word_count })`. Pure observability — no behavior change. The embedding *failure* path
  (`embedding_write_failed`) was already logged and is untouched.
- `npx tsc --noEmit` clean.

### Removed (2026-07-10 — Delete the `/echo/[id]` detail route and all tap-nav call sites)
- **Context:** with `EntryActionMenu` (Edit/Move/Delete) now the way to act on an echo card, the
  read-only `/echo/[id]` detail screen no longer earns its keep. This removes the route, its
  screen, the service function that fed it, and every tap-through that navigated to it.
- **Deleted:** `app/(app)/echo/[id].tsx` (route — the `app/(app)/echo/` dir is now empty),
  `features/echo/components/EchoDetailScreen.tsx` (its only consumer), and `getEntryById()` in
  `features/echo/services/echo-service.ts` (confirmed sole consumer was `EchoDetailScreen`).
- **`features/echo/components/EchoScreen.tsx`:** removed the `Pressable` wrapper (not just its
  `onPress`) around the list card — `EntryActionMenu` is now the only way to act on this card.
  Dropped the now-unused `router` import (`Pressable` stays; still used by the goal-picker modal).
- **`features/goals/components/EchoTrail.tsx`:** the content `Pressable` is now a plain `Text` —
  the card is view-only. Dropped the now-unused `router` import (`Pressable` stays; still used by
  the Confirm/Dismiss suggestion buttons).
- **`features/goals/components/ActivityFeed.tsx`:** removed the `Pressable` wrapper from both
  branches of `EchoEntryCard` (bare `ReflectionCard` for the AI-reflection path; the raw-preview
  fallback is now a static `View` with the former non-pressed style values). Dropped the unused
  `router` and `Pressable` imports.
- **Decision (Ariel):** goal-trail and activity-feed echo cards are intentionally inert (no tap,
  no action menu) for now — `EntryActionMenu` lives in `features/echo/` and `features/CLAUDE.md`'s
  no-cross-feature-import rule blocks `features/goals/` from importing it. Extracting it to
  `components/ui/` (same move `ReflectionCard` made in Block 2) is logged to OUTSTANDING.md as a
  follow-up, not built this session. Also checked off OUTSTANDING's "EchoTrail links point to a
  screen that doesn't exist" — resolved by this removal.
- `npx tsc --noEmit` clean. Files: deleted `app/(app)/echo/[id].tsx`,
  `features/echo/components/EchoDetailScreen.tsx`; edited `features/echo/services/echo-service.ts`,
  `features/echo/components/EchoScreen.tsx`, `features/goals/components/EchoTrail.tsx`,
  `features/goals/components/ActivityFeed.tsx`.

### Added (2026-07-10 — Echo entry edit from the action menu)
- **Context:** the delete-consolidation patch shipped Delete but deferred Edit (no edit surface
  existed at the time). The server PATCH route (`/api/entries/[id]`) and its client wrapper
  `updateEntry()` in `echo-service.ts` landed separately (content update + re-embed + stale-
  reflection reset are all server-side). This patch adds the missing **Edit** UI on top of them.
- **`features/echo/store.ts`:** new `updateEntryFields(entryId, { content?, title? })` action —
  an optimistic field patch applied after a successful save. Mirrors `setEntryContainer`'s
  map-and-merge shape; only overwrites supplied fields (`title: null` clears the title back to
  `undefined`). Does not touch container assignment — that stays `setEntryContainer`'s job.
- **`features/echo/hooks/useEditEntry.ts` (new):** owns the edit flow the way `useMoveEntry` owns
  the move flow — runs `updateEntry()` (PATCH) → `updateEntryFields()` (optimistic patch),
  tracking `activeEntry` / `isSaving` / `error`. On a `entry_not_found` (404) it calls
  `onEntryGone` (wired to the store's `removeEntry`) and closes; offline/server/generic errors
  keep the sheet open with the message. Keeps service calls out of the component (features/ rule 3).
- **`features/echo/components/EditEntryModal.tsx` (new):** presentational bottom-sheet, pre-filled
  from the entry's content/title, calling no services itself. Reuses the composer's title/content
  `TextInput` styling but none of its draft-persistence / linked-goal logic (doesn't apply to a
  saved entry). Cancel + Save buttons; Save disabled while empty or in flight; dismissal blocked
  mid-save. Does not edit container assignment — that's Move's job.
- **`features/echo/components/EntryActionMenu.tsx`:** added an `onEdit` prop and a third **Edit**
  `<Pressable>` row (above Move / Delete), same styling as the existing rows; no popover
  positioning changes.
- **`features/echo/components/EchoScreen.tsx`:** instantiates `useEditEntry({ onEntryGone:
  removeEntry })`, threads `onEdit` through `EchoEntryListCard` alongside the existing
  `onOpenMoveMenu`/`onDelete`, and renders `EditEntryModal` next to `MoveEntryModal`. No new route
  — the sheet lives inside `EchoScreen`.
- `npx tsc --noEmit` clean. Files: `store.ts`, `hooks/useEditEntry.ts`, `components/EditEntryModal.tsx`,
  `components/EntryActionMenu.tsx`, `components/EchoScreen.tsx`.

### Fixed (2026-07-10 — Consolidate entry delete onto the server route; remove the duplicate)
- **Context / correcting the record:** two Echo-delete implementations landed independently.
  Task 1 ("Entry Delete / hard delete") shipped the **server** route `DELETE /api/entries/[id]`
  (`withAuth` + `isEntryOwnedByUser` → 404) — the approved pattern, mirroring Move, chosen
  specifically because server-side ownership enforcement is stronger than goal-delete's bare-RLS
  approach. Task 4 ("Echo entry delete from the action menu") then separately added a **client-side**
  `deleteEntry()` in `echo-service.ts` doing a direct RLS-scoped Supabase delete
  (`supabase.from('echo_entries').delete().eq('id', ...)`), modeled on `goal-service.deleteGoal`
  — the pattern we had deliberately decided *not* to use here. That direct-delete bypassed the
  Task 1 route entirely. **There was no instruction to skip the server route or to prefer
  goal-delete's pattern; the earlier changelog framing of the client delete as the intended path
  was incorrect.** The Delete menu's network call now goes through the server route.
- **`features/echo/services/echo-service.ts`:** `deleteEntry(entryId)` no longer talks to Supabase
  directly. It now issues a thin `authedFetch('/api/entries/:id', { method: 'DELETE' })` to the
  Task 1 route (same `authedFetch` mechanics as `moveEntryRequest`/`updateEntry`). It keeps its
  `Promise<void>` / throw-on-failure contract — the store's `deleteEntry` action and
  `EchoScreen.handleDeleteEntry`'s try/catch depend on the throw — so it throws on a non-`ok`
  response (surfacing the server `error` message when present) rather than returning a result
  object. Ownership is now enforced server-side; `echo_entry_links` cascade and the
  `interests.source_thorn_id` `ON DELETE SET NULL` behavior are handled by the route.
- **Unchanged:** `store.ts`'s `deleteEntry` action (still persists-then-filters; its underlying
  call now routes through the corrected service fn), and `EntryActionMenu`'s Delete confirmation
  flow (`window.confirm`/`Alert.alert`, "This cannot be undone", Cancel/Delete) — only the
  underlying network call changed.
- `npx tsc --noEmit` clean. Files touched: `features/echo/services/echo-service.ts`.

### Added (2026-07-10 — Echo entry delete from the action menu)
- **Context:** the Echo list's per-entry `···` menu (`EntryActionMenu`) only offered
  "Move to folder". Added an in-menu **Delete** action. Scope was originally "Edit + Delete"
  but Edit was deferred: the repo has no Echo-entry edit surface (`EchoDetailScreen` is
  read-only, no update endpoint), so an "Edit" row would either duplicate the card tap or
  require a new edit flow beyond this patch. Product decision: ship Delete only now.
- **`features/echo/services/echo-service.ts`:** new `deleteEntry(entryId)` — a client-side,
  RLS-scoped `supabase.from('echo_entries').delete().eq('id', entryId)` that throws on error.
  Mirrors `goal-service.deleteGoal`. `echo_entry_links` rows cascade via the FK
  (`echo_entry_id ... on delete cascade`, migration 005).
- **`features/echo/store.ts`:** new async `deleteEntry(entryId)` store action mirroring
  `goal-store.deleteGoal` — persists first (throws on failure), then filters the row out of
  `entries`. The existing `removeEntry` stays a standalone optimistic remove for the move
  flow's "entry gone server-side" (404) path.
- **`features/echo/components/EntryActionMenu.tsx`:** added `onDelete` prop and a second
  `<Pressable>` row inside the existing `AnchoredPopover` (destructive `#C0483A`, matching
  `GoalCard`'s delete color). No positioning changes — the popover re-measures via `onLayout`.
- **`features/echo/components/EchoScreen.tsx`:** threaded `onDelete` through `EchoEntryListCard`
  the same way `onOpenMoveMenu` is. New `handleDeleteEntry` mirrors `GoalCard`'s web/native
  confirmation split exactly (`window.confirm` on web, `Alert.alert` elsewhere; "This cannot be
  undone", Cancel/Delete), then calls the store's `deleteEntry`; failures surface an alert.
- `npx tsc --noEmit` clean. Files touched: `features/echo/services/echo-service.ts`,
  `features/echo/store.ts`, `features/echo/components/EntryActionMenu.tsx`,
  `features/echo/components/EchoScreen.tsx`.
### Added (2026-07-10 — Entry Delete / hard delete)
- **`app/api/entries/[id]+api.ts`:** new route exporting `DELETE`. Hard-deletes an
  Echo entry the caller owns. Coexists with the sibling `app/api/entries/[id]/move+api.ts`
  (different file, no route conflict — `/api/entries/:id` DELETE vs `/api/entries/:id/move`
  PATCH). Shape is a byte-for-byte mirror of the Move route: `isDatabaseConfigured` 503
  guard → `withAuth` → `sanitizeString(params.id)` (400 on bad id) → `createAuthedClient` →
  `isEntryOwnedByUser` (404 if not owned) → `.from('echo_entries').delete().eq('id', entryId)`
  → `{ success: true }`. Same local `sanitizeString` helper and same try/catch 500 shape.
- **Client:** no new store action — the existing `removeEntry(entryId)` in
  `features/echo/store.ts` handles optimistic removal.
- **Provenance note (documented, not changed):** `interests.source_thorn_id` FK is
  `ON DELETE SET NULL` (`supabase/migrations/002_echo.sql:83`). Deleting a thorn-sourced
  entry nulls that provenance pointer on any derived `interests` row without deleting the
  row. Confirmed non-blocking: repo-wide grep found **zero** application-code consumers of
  `source_thorn_id` (lib/app/hooks/features/components/types), so nothing assumes it is
  populated. Behavior left as-is.

### Smoke-test checklist
- DELETE `/api/entries/:id` for an owned entry → 200 `{ success: true }`, row gone.
- DELETE another user's entry id → 404 `Not found` (no delete).
- DELETE with DB unconfigured → 503; malformed/empty id → 400.
- Delete a thorn-sourced entry that seeded an `interests` row → interests row survives with
  `source_thorn_id` nulled.

### Changed (2026-07-10 — Sign-out consolidation cleanup)
- **Context:** closes out audit finding #3 from the 401-handling work: two separate
  sign-out implementations existed (`lib/api/client.ts`'s `signOutAndRedirect()` and
  `features/auth/services/auth-service.ts`'s `signOut()`). Decision (product): local-scope
  sign-out only — signing out on one device must not kill sessions on the user's other
  devices — and `signOutAndRedirect()` is the single implementation going forward.
- **`features/auth/services/auth-service.ts`:** removed the dead `signOut()` export.
  Confirmed via repo-wide grep immediately before deletion that it had zero callers
  (`AvatarMenu.tsx` already calls `signOutAndRedirect()` directly, not this). `signIn`,
  `signUp`, and `getSession` in this file are unrelated and untouched; the `supabase`
  import stays since those three still use it.
- No changes to `signOutAndRedirect()` or `AvatarMenu.tsx` — both were already correct.
- If "sign out of all other devices" is needed later, that should be a new,
  explicitly-named function (e.g. `signOutAllDevices()`) built when actually scoped, not
  a reason this dead function should have been kept speculatively.
- `npx tsc --noEmit` clean. Files touched: `features/auth/services/auth-service.ts`,
  `CHANGELOGCODEX.md`.

### Changed (2026-07-09 — Session 4.4 follow-up: authedFetch migrated to screens/components; sign-out unified)
- **Context:** third and final follow-up to the 401-handling work. Closes out the six
  non-hook call sites flagged as out-of-scope in the previous pass:
  `app/(app)/dashboard.tsx`, `app/(app)/constellation.tsx`, `app/goals/create.tsx`,
  `components/layout/{SettingsModal,AccountModal,AvatarMenu}.tsx`.
- **`dashboard.tsx`:** its local `getAccessToken()` helper (reused across 5 call sites —
  `DueTodayZone`'s load/complete, `ActiveGoalCard`'s status update, the background Echo
  reconcile, and the Intelligence insight fetch) is gone; all 5 now use `authedFetch`.
  The reconcile/insight calls were previously "fail silently" on any error, including a
  missing session — they now redirect-to-login specifically on a genuine 401, same as
  everywhere else, while still swallowing non-auth failures silently (network errors,
  5xx) exactly as before.
- **`constellation.tsx`, `SettingsModal.tsx`:** straightforward `getAccessToken` →
  `authedFetch` swaps, same pattern.
- **`AccountModal.tsx`:** split its `getAccessTokenAndUserId()` helper — the avatar
  upload's Supabase Storage call needs `userId` only (storage calls use the ambient
  client session, never a manual Bearer header) via a slimmed `getUserId()`; the actual
  `/api/profile` GET/PATCH calls (load, avatar-url patch, save) now go through
  `authedFetch` and no longer need a token threaded in at all.
- **`goals/create.tsx`:** the `/api/goals/create` and `/api/goals` POST calls (gated
  behind an explicit `getUser()`+`getSession()` check before this change) now use
  `authedFetch`, which subsumes that gate. **Deliberately NOT migrated:** the
  `/api/actions` POST in the post-finalization "action capture" turn — its own comment
  says "action is a bonus, not a gate," and it already sends the request even with no
  token, treating a non-ok response as a non-fatal warning so the user still navigates
  to their new goal. Migrating this one to `authedFetch` would turn a soft, non-blocking
  failure into a hard redirect-to-login at exactly the moment a goal was just
  successfully created — preserved as-is, same reasoning as `echo/reflect`'s pre-auth
  early return in the previous pass.
- **`AvatarMenu.tsx` — also closes out audit finding #2:** the original Step-0 audit
  named this file's manual sign-out (`clearAllStores` + `signOut({scope:'local'})` +
  redirect) as one of three original divergent 401/session-end behaviors. `lib/api/client.ts`'s
  internal sequence for the same steps is now exported as `signOutAndRedirect()` and
  reused directly here — the profile-chrome fetch also moved to `authedFetch`. All three
  originally-catalogued sites (`onAuthStateChange`, `AvatarMenu`'s sign-out, and
  Vault's local error state) now share one implementation.
- `npx tsc --noEmit` clean. Net: -112 lines across 7 files. Sweep of the whole client
  tree confirms no manual `Authorization: Bearer` header construction remains outside
  the one deliberately-preserved `goals/create.tsx` action-capture call.
- Files touched: `app/(app)/dashboard.tsx`, `app/(app)/constellation.tsx`,
  `app/goals/create.tsx`, `components/layout/{SettingsModal,AccountModal,AvatarMenu}.tsx`,
  `lib/api/client.ts`, `CHANGELOGCODEX.md`.

### Changed (2026-07-09 — Session 4.4 follow-up: authedFetch migrated to all remaining hooks)
- **Context:** second follow-up to the 401-handling work. The server side (all 19 API
  routes on `withAuth`) was finished in the previous pass; this pass finishes the client
  side named in the original audit: `useVault`, `useGoalDetail`, `useActivity`,
  `useEchoTrail`, `useLatestAction`, and `fetchFolders`/`getEntryContainer` in
  `echo-service.ts`.
- **`features/goals/hooks/useVault.ts`:** all five methods (`refresh`, `addNote`,
  `addLink`, `updateItem`, `removeItem`) now call `authedFetch` instead of each
  independently fetching the session and building the `Authorization` header. Previously
  `refresh` was the only method that surfaced `setError('Unauthorized')` on a missing
  session — the other four silently no-op'd; now all five converge on `authedFetch`'s
  redirect-to-login instead of three different behaviors in one file.
- **`features/goals/hooks/useGoalDetail.ts`:** `onCompleteMeasurable`'s manual
  session-check-then-fetch replaced with `authedFetch`; kept the friendlier "You need to
  be signed in..." message by catching `UnauthorizedError` specifically. The unrelated
  `load()` effect (direct `supabase.auth.getUser()` + `lib/db` service calls, no `/api/*`
  fetch involved) is untouched — out of scope for this wrapper.
- **`features/goals/hooks/useActivity.ts`, `features/actions/hooks/useLatestAction.ts`:**
  same pattern — manual session-check-then-fetch replaced with `authedFetch`;
  `useLatestAction` had this duplicated twice in the same file (initial load effect +
  `mutate`), both fixed.
- **`features/goals/hooks/useEchoTrail.ts`:** `confirmLink`/`dismissLink` migrated;
  `refresh` (which calls `lib/db/echo-entry-links` directly, not `/api/*`) untouched.
- **`features/echo/services/echo-service.ts`:** `requestEchoReflection` (used by
  `createEntry`) and `fetchFolders` migrated to `authedFetch`, dropping their
  `accessToken` parameters — the session is now fetched internally by `authedFetch`
  rather than threaded in by every caller.
- **`features/echo/hooks/useMoveEntry.ts`:** its local `getAccessToken` helper (built on
  `supabase.auth.getSession()`) is gone entirely now that `fetchFolders()` no longer
  needs a token passed in — both call sites (`open`, and the `target_not_found` retry in
  `confirm`) simplified accordingly.
- **Not migrated (out of scope — these are screens/components, not the hooks the audit
  named):** `app/(app)/dashboard.tsx`, `app/(app)/constellation.tsx`,
  `app/goals/create.tsx`, `components/layout/{SettingsModal,AccountModal,AvatarMenu}.tsx`
  still build their own `Bearer` header inline. Candidates for a further pass.
- `npx tsc --noEmit` clean. Net: -137 lines across 7 files.
- Files touched: `features/goals/hooks/{useVault,useGoalDetail,useActivity,useEchoTrail}.ts`,
  `features/actions/hooks/useLatestAction.ts`, `features/echo/services/echo-service.ts`,
  `features/echo/hooks/useMoveEntry.ts`, `CHANGELOGCODEX.md`.

### Changed (2026-07-09 — Session 4.4 follow-up: withAuth migrated to all remaining routes)
- **Context:** follow-up to the "first cut" below, which deliberately migrated only one
  route (`entries/[id]/move+api.ts`) as a demo and left the other 18 for incremental
  adoption. Migrated the rest of them now, in one pass.
- **18 route files migrated to `withAuth`:** `actions/[id]`, `actions/index`,
  `dashboard/summary`, `echo-links/index`, `echo-links/[linkId]`, `echo/reconcile`,
  `echo/reflect`, `folders/index`, `folders/[id]`, `goals/activity`,
  `goals/complete-measurable`, `goals/create`, `goals/index`, `intelligence/index`,
  `measurables/due-today`, `profile/index`, `vaults/[goalId]`, `vaults/items/[itemId]`.
  All 12 files that had copy-pasted their own local `getAuthContext`/
  `getAuthContextFromRequest` are gone; the 5 files that hand-rolled the
  header-parse-and-`getUser()` check inline (`goals/activity`, `goals/complete-measurable`,
  `dashboard/summary`, `measurables/due-today`, plus `echo/reconcile`'s locally-shadowed
  `getAuthContext`) are also converted. `goals/index` and `profile/index` already used the
  shared `getAuthContext` export (no duplication) but not the `withAuth` wrapper — migrated
  for full consistency so every route now goes through the same helper. Net: -154 lines
  across 19 files (this pass + the earlier `move+api.ts` demo).
- **`withAuth` extended with an optional `onUnauthorized` hook** (`lib/api/auth.ts`): three
  routes (`goals/create`, `goals/index`, `intelligence/index`, `profile/index`) are
  documented as returning the `AiResponse`/`ApiResponse` envelope on 401
  (`{ok:false, data:null, error:{code:'UNAUTHORIZED', ...}}`), not the plain
  `{error:'Unauthorized'}` body the other routes return. `withAuth` defaults to the plain
  shape and takes `{ onUnauthorized: () => Response }` to preserve the documented envelope
  exactly on those four — de-duplicating the auth check without silently changing a
  response contract (root CLAUDE.md marks AI output contracts L3/team-decision).
- **One behavior-preserving structural note:** `echo/reflect+api.ts`'s `POST` has an early
  return (`aiInsightRequested === false`) that runs *before* the auth check even in the
  original code — i.e. that one path was reachable without a valid session. Preserved
  exactly: the JSON-body parse and that early return still happen before `withAuth` is
  invoked; only the remainder of the handler moved into an auth-wrapped function. Flagged
  here since it's easy to accidentally "fix" (move auth first) while refactoring, which
  would be an authorization behavior change, not a dedup — out of scope for this pass.
  Similarly, `goals/activity+api.ts` previously checked `goalId` presence (400) before
  checking auth (401); migrating flips that order (auth now runs first, matching every
  other route) — a minor, intentional consistency fix rather than a preserved quirk, since
  no legitimate caller is affected (a real client always sends a token).
- `npx tsc --noEmit` clean after the full pass.
- Files touched: the 18 route files listed above, `lib/api/auth.ts`, `CHANGELOGCODEX.md`.

### Added (2026-07-09 — Session 4.4: app-wide 401 handling, first cut)
- **Context:** follows the Step 0 read-only 401-handling audit this session, which found no
  app-wide interceptor — three divergent client-side reactions to auth failure
  (`onAuthStateChange` redirect, `AvatarMenu`'s manual sign-out, `useVault`'s local
  `setError('Unauthorized')`), a fourth flagged-but-deferred gap in `moveEntryRequest`
  (explicit placeholder comment referencing this exact audit), and the server-side identity
  check (`getAuthContext`) duplicated locally in 12 of 14 route files instead of imported from
  `lib/api/auth.ts`. Full cutover this session (not incremental) per explicit instruction —
  pre-pilot, no live-data migration risk.
- **`lib/api/client.ts` (new):** `authedFetch(path, init)` — attaches the current session's
  Bearer token and, on a 401 (missing session or server-rejected token), clears all Zustand
  stores, nulls the auth store's session, calls `supabase.auth.signOut({ scope: 'local' })`, and
  redirects to `/(auth)/login` — converging with what `onAuthStateChange` already does for
  refresh-token expiry, so both paths now produce the same visible behavior instead of a third
  one being invented. Non-401 statuses (404, 500, ...) are returned to the caller unchanged;
  this wrapper only owns the "is this request authenticated" concern.
- **`lib/api/auth.ts`:** added `withAuth(handler)` — wraps a route handler with the existing
  `getAuthContext` check so route files stop hand-rolling `if (!auth) return 401`. Only 2 of 14
  route files used the shared `getAuthContext` export before this; the other 12 are unchanged
  for now (see below) and remain candidates for a follow-up mechanical migration.
- **Retrofit demo (one route + one hook, per audit's minimum-viable-retrofit recommendation):**
  - `app/api/entries/[id]/move+api.ts`: replaced its locally-duplicated
    `getAuthContextFromRequest` with `withAuth`. The pre-existing `isDatabaseConfigured` 503
    check is kept as an outer gate before `withAuth` runs (rather than folded into it), since
    `getAuthContext` itself collapses "not configured" into a 401 — keeping 503 distinct here
    is strictly more correct than the two existing `getAuthContext` call sites (`goals/index`,
    `profile/index`), which don't separate the two.
  - `features/echo/services/echo-service.ts`'s `moveEntryRequest`: now calls `authedFetch`
    instead of building its own `Authorization` header from a passed-in `accessToken`, and its
    401 branch no longer maps to `'generic'` with a stale "no interceptor exists yet" comment —
    401 now can't reach this function's response-handling logic at all (authedFetch intercepts
    and redirects first); the `catch` only needs to distinguish `UnauthorizedError` (session
    expired — user is already being redirected) from a genuine network failure (`'offline'`).
  - `features/echo/hooks/useMoveEntry.ts`: `confirm()` no longer fetches an access token before
    calling `moveEntryRequest` (that's now internal to `authedFetch`); the token is still
    fetched locally for the `target_not_found` retry path, which calls `fetchFolders`
    (unmigrated — takes a token directly, out of scope this session).
- **Explicitly not done this session (per instruction):** the other 11 route files' local
  `getAuthContext` duplicates, and the remaining client hooks (`useVault`, `useGoalDetail`,
  `useActivity`, `useEchoTrail`, `useLatestAction`, `fetchFolders`/`getEntryContainer` in
  `echo-service.ts`) that still hand-roll session-fetch + header-build + `res.ok` checks. These
  are mechanical follow-ups once this pattern has been reviewed — new code should adopt
  `authedFetch`/`withAuth` directly; old call sites migrate opportunistically, not on a
  deadline, since the old and new patterns don't conflict in the meantime.
- Files touched: `lib/api/client.ts` (new), `lib/api/auth.ts`,
  `app/api/entries/[id]/move+api.ts`, `features/echo/services/echo-service.ts`,
  `features/echo/hooks/useMoveEntry.ts`, `CHANGELOGCODEX.md`.

### Changed (2026-07-09 — Session 4.3 follow-up: backfill + constraint-name fix)
- **Pre-existing-profile backfill (migration 017, amended in place — pre-pilot, not yet merged):**
  the eager-provisioning trigger only covers profiles inserted from the migration forward; any
  profile that already existed at migration time would otherwise have no General folder and no
  path to get one (`getGeneralFolderId()` is a read-only, client-side lookup with no creation
  fallback, by design). Added a one-time backfill directly below the trigger: `INSERT ... SELECT`
  over `public.profiles` with a `NOT EXISTS` scoping filter, guarded by the same `ON CONFLICT
  (user_id) WHERE (is_general = true) DO NOTHING` idempotent shape `get_or_create_general_folder()`
  itself uses. Plain SQL rather than a per-row function call, since this is a one-time data
  operation, not ongoing provisioning logic.
- **Migration 018 constraint-name fix:** the previous version guessed between the two plausible
  names for `link_source`'s check constraint (`echo_goal_links_..._check` pre-rename vs.
  `echo_entry_links_..._check` post-rename) via two defensive `DROP CONSTRAINT IF EXISTS`
  statements. Replaced with a dynamic lookup: a `DO` block queries `pg_constraint` for whatever
  check constraint on `echo_entry_links` currently references `link_source` and drops it by its
  actual (discovered) name. This makes the migration correct regardless of which name turns out
  to be live, without requiring a live schema check to confirm it in advance — still no live
  Supabase credentials in this environment, so this was verified by careful read of the query
  logic only, not by running it; worth a live apply-and-verify pass (or `\d echo_entry_links`
  before/after) as part of CTO sign-off, but the migration no longer depends on a guess.
- Files touched: `supabase/migrations/017_eager_general_folder_provisioning.sql` (amended),
  `supabase/migrations/018_echo_entry_links_system_default_source.sql` (rewritten),
  `CHANGELOGCODEX.md`.

### Changed (2026-07-09 — Session 4.3: General Folder eager provisioning + createEntry() cutover)
- **Context:** follows the Step 0 read-only audit and the Opus architectural review of this
  session (General-folder eager-provisioning + `createEntry()` cutover sequencing). Zero
  production data (pre-pilot), so this lands as one coordinated change rather than a staged
  migration.
- **Eager General-folder provisioning:** added `supabase/migrations/
  017_eager_general_folder_provisioning.sql` — a new `AFTER INSERT ON public.profiles` trigger
  (`handle_new_profile_general_folder()`) calling `get_or_create_general_folder()`, mirroring
  `handle_new_user_space()`'s (003) try/exception non-blocking shape. Kept as a separate trigger
  function rather than folded into `handle_new_user_space()`, so each provisioning concern stays
  independently auditable. Not independently verified against a live Supabase instance (no
  credentials in this environment) — flagged in the migration header as the one thing that
  deserves a live signup smoke test, specifically the SECURITY DEFINER-calling-a-service-role-
  locked-RPC interaction.
- **`getActivityByGoalId` cutover (`lib/db/goals.ts`):** removed the legacy direct
  `echo_entries.goal_id` query branch and its `legacyEchoEntryIds` dedup-against-`echo_entry_links`
  logic entirely. The function now reads `echo_entry_links` exclusively for goal-linked
  reflections. The now-unused `DbEchoEntryRow` type and its `EchoEmotion` import were removed.
  Note: this makes `ActivityKind: 'echo_entry'` (`types/activity.ts`) and its renderer
  (`EchoEntryCard` in `features/goals/components/ActivityFeed.tsx`) permanently dead — never
  emitted by this function anymore. Left both in place (out of scope for this pass; `types/*` is
  CEO-owned and `components/*` is VP-Product-owned) — flagging as Codex cleanup candidates.
- **`createEntry()` cutover (`features/echo/services/echo-service.ts`):** the insert no longer
  writes `echo_entries.goal_id` (column preserved per root CLAUDE.md, just no longer populated on
  new rows). STEP 2 (previously "manual goal linking", fire-and-forget) is now "container
  resolution" and is **awaited**, not fire-and-forget: with the legacy FK join gone, it's the only
  way the returned entry can carry an accurate `goalId`/`goalTitle` or `folderId`/`folderName`
  immediately. When `goalId` is provided: writes the confirmed goal link as before, plus a
  one-off `goals.title` lookup (the FK-embed join that used to supply this is now always null).
  When `goalId` is null: unconditionally resolves and assigns a confirmed `echo_entry_links` row
  to the caller's General folder — **not gated on STEP 3's keyword heuristic finding a match**,
  per the architectural review's Question A resolution (an unconfirmed `ai_auto` suggestion is
  advisory, not a container; migration 016 only caps *confirmed* rows at one-per-entry, so both
  coexist). STEP 3 (keyword auto-link) is unchanged in logic and still fire-and-forget/advisory-only.
  The response entry is built via `applyContainer()` (the same overlay `fetchEntries`/`getEntryById`
  already use) against the container just resolved, applied to every return path including the
  post-AI-reflection re-map.
- **Client/service-role boundary fix:** the General-folder resolution deliberately does **not**
  call `getOrCreateGeneralFolderId()` (service_role-only RPC, migration 014) — `echo-service.ts`
  executes client-side (called directly from `useEntries.ts`), and importing that function would
  pull `service-client.ts` into the client bundle, violating `lib/db/CLAUDE.md`'s explicit "never
  import from client-bundled code" rule. Added `getGeneralFolderId()` (`lib/db/echo-folders.ts`)
  instead: a plain RLS-scoped read (`echo_folders` where `is_general = true`), safe client-side,
  relying on migration 017's eager provisioning to guarantee the row exists by the time any user
  can call `createEntry()`. If it's ever missing, the container is skipped (non-blocking), same
  pattern used everywhere else in this codebase.
- **New link source:** added `'system_default'` to `EchoLinkSource` (`types/echo-link.ts`,
  extending the union per `types/CLAUDE.md`) and widened `echo_entry_links.link_source`'s DB check
  constraint (`supabase/migrations/018_echo_entry_links_system_default_source.sql`) to allow it —
  the General-folder fallback assignment is neither a user's manual choice nor an AI suggestion,
  so labeling it `'manual'` would misrepresent it. The migration drops the check constraint
  defensively under both its pre-rename and post-rename possible names (`echo_goal_links_..._check`
  / `echo_entry_links_..._check`) since 012's table rename didn't explicitly rename it and this
  wasn't checked against a live schema — flagged in the migration header.
- **Not touched, per scope:** `entry.folderId` dead-code removal (separate follow-up), menu
  redesign, Edit/Delete backend, 401 handling, migration squash, `handle_new_user()` itself.
- Files touched: `supabase/migrations/017_eager_general_folder_provisioning.sql` (new),
  `supabase/migrations/018_echo_entry_links_system_default_source.sql` (new), `lib/db/goals.ts`,
  `lib/db/echo-folders.ts`, `features/echo/services/echo-service.ts`, `types/echo-link.ts`,
  `CHANGELOGCODEX.md`.

### Changed (2026-07-09 — Cleanup: remove dead client `entry.folderId`)
- Removed the dead client-only `folderId` field from `features/echo/types.ts`'s `EchoEntry` and
  deleted the matching optimistic write-only assignments in `features/echo/store.ts`,
  `features/echo/hooks/useMoveEntry.ts`, and `features/echo/services/echo-service.ts` (including
  the rebased `createEntry()` General-folder container payload) after a fresh grep re-verified
  there were still no read/render sites for `entry.folderId`.

### Added (2026-07-09 — Session 4.2: Anchored entry action popover)
- Added `components/ui/AnchoredPopover.tsx`, a reusable `Modal transparent`-backed popover
  primitive that positions itself from a measured trigger rect, right-edge-aligns to the anchor,
  clamps to the viewport with a small margin, and flips upward when there is not enough room
  below. This keeps the interaction lightweight and web/native-safe without adding a popover
  dependency.

### Changed (2026-07-09 — Session 4.2: EntryActionMenu anchored-menu adoption)
- Replaced `features/echo/components/EntryActionMenu.tsx`'s bottom-anchored sheet with the new
  anchored popover so the existing single "Move to folder" row now opens adjacent to the `···`
  trigger instead of consuming the bottom of the screen. The trigger captures its rect via
  web `getBoundingClientRect()` when available and falls back to `measureInWindow()` without
  changing the existing `onMoveToFolder` wiring. Files touched: `components/ui/AnchoredPopover.tsx`,
  `features/echo/components/EntryActionMenu.tsx`, `CHANGELOGCODEX.md`.

### Changed (2026-07-09 — Session 4.1: Move-to-Folder bug-fix pass, per Opus code review)
- **Step 0 audit:** `get_or_create_general_folder()` fires **only** from the folder DELETE-reassign
  path (`app/api/folders/[id]+api.ts`), never on entry save (`createEntry` writes no folder link)
  and never on folder list (`GET /api/folders` is a plain SELECT). A user who has only saved
  entries has **no** General folder — this is why manual-checklist item 9 had no General target.
  Whether container-less entries *should* auto-land in General is a product-design question and a
  write-path change; **deferred** to the migration-squash session, not touched here. No Supabase
  credentials exist in-repo, so the "has this user saved a container-less entry" DB check was not
  runnable — but the code makes it moot (nothing auto-provisions General on save regardless).
- **Canonical container read (Opus finding #4 — cross-reload pill staleness):**
  `features/echo/services/echo-service.ts` now overlays each entry's pill from its **confirmed
  `echo_entry_links` row** (`fetchConfirmedContainers`, batched, same `confirmed = true`
  single-container scoping as `getEntryContainer`) in both `fetchEntries` and `getEntryById`,
  instead of trusting the legacy `echo_entries.goal_id → goals()` join. A move only rewrites
  `echo_entry_links`, so pre-fix a moved-to-folder entry showed its **old goal pill** after reload.
  `mapEntry`'s legacy join is retained as a fallback for entries with no confirmed link (so
  never-linked entries → no pill, freshly-created entries still show their pill immediately) — the
  **write path (`createEntry`) is deliberately untouched**, this is a read-side fix only. This
  supersedes the Session 4 note below that "`fetchEntries`/`getEntryById` still only join `goals`."
  `setEntryContainer` was **kept** (not removed): it is *not* redundant — it is the in-session
  optimistic update; the canonical read only corrects the picture on the next fetch/reload.
- **Confirmed-row invariant (Opus finding #1):** added `supabase/migrations/
  016_echo_entry_links_one_confirmed.sql` — a partial unique index enforcing at most one
  `confirmed = true` row per `echo_entry_id`, codifying "an entry is never in both a goal and a
  folder at once" that `.maybeSingle()` already assumed.
- **Rapid-switch preselect race + save-state guards (Opus finding #6):** `useMoveEntry.open` now
  captures the requested entry id in a ref and drops a late-resolving fetch if a newer `open`/
  `close` superseded it (no more wrong checkmark when switching entries fast). `MoveEntryModal`
  blocks backdrop / hardware-back dismissal while `isSaving`, and dims + `disabled`s the picker
  rows during an in-flight move.
- **Differentiated move-error UX (Opus finding #3, scoped):** `moveEntryRequest` now returns a
  typed `kind` (`entry_not_found` | `target_not_found` | `offline` | `server` | `generic`).
  `useMoveEntry.confirm` acts on it: 404-entry-gone → remove the entry from the list (`removeEntry`,
  new store action) and close; 404-target-gone → refresh the picker options (folders in-hook, goals
  via `reloadPickerGoals`) and keep the modal open with friendly copy; 500 → generic retry copy.
  **401 is intentionally left as existing behavior** (surface the message) — Step 0 confirmed there
  is **no app-wide 401/re-auth interceptor** to reuse (`onAuthStateChange` in `_layout`, ad-hoc
  `setError('Unauthorized')` in `useVault`), so no one-off flow was invented here. **Gap flagged.**
- **Session outcome:** originated from a read-only Opus code review of merged PR #7 (6 findings
  across the new `echo_entry_links` read, tap isolation, error handling, orphaned fields, the
  store action, and a preselect race). Findings #1/#3/#4/#5/#6 were fixed above and shipped as
  **PR #9 (merged, merge commit `8a13075`)**; `main` synced local + remote. `tsc --noEmit` clean;
  no live-DB/app runtime verification was possible (no Supabase creds in-repo). Deferred/flagged
  items (General-folder-on-save design question, `createEntry` legacy dual-write, orphaned
  `folderId`, the 401 gap, string-based 404 disambiguation, Edit/Delete actions, and applying
  migration `016`) are tracked in `OUTSTANDING.md` → Echo.

### Added (2026-07-09 — Session 4: Entry Action Menu + Move-to-Folder Picker)
- **Step 0 audit (read-only, done before any code):**
  - No edit-entry flow exists anywhere — no edit-composer route, no update-entry API route.
  - No delete-entry API route or DB function exists (`lib/db/echo-entry-links.ts`'s only
    `.delete()` is `dismissLink`, which removes an unconfirmed AI-suggested link row, not an
    entry). Per instruction, the action menu omits Edit/Delete entirely rather than wiring dead
    buttons, and no delete/edit backend was created this session.
  - No existing query read the *full* confirmed `echo_entry_links` row — `moveEntryContainer`
    (Session 3) only ever selected `id` from it, to decide update-vs-insert. Added a new read
    (`getEntryContainer`) rather than duplicating that logic, relying on the same RLS ownership
    path (`echo_entries.user_id = auth.uid()`, `005_echo_goal_links.sql`) already used by
    `fetchEntries`/`getEntryById`.
- **Entry action menu:** `features/echo/components/EntryActionMenu.tsx` (new) — an always-visible
  "···" button, rendered as an absolutely-positioned **sibling** of `EchoEntryListCard`'s existing
  `Pressable` (not nested inside it), so opening the menu can never trigger the card's
  navigate-to-detail `onPress` — no `stopPropagation()` needed, identical behavior on web and
  native. Tapping it opens a small bottom-sheet `Modal` (matching the existing bottom-sheet
  pattern in `EchoScreen.tsx`'s "Link a goal" picker) with a single row, "Move to folder" —
  Edit/Delete rows are omitted per the Step 0 findings above.
- **Move-to-folder/goal picker:** `features/echo/components/MoveEntryModal.tsx` (new) — single-
  select list with two sections: "Projects" (reuses `fetchActiveGoalsForPicker`,
  `echo-service.ts:387-399`, unchanged — not duplicated) and "Echo Folders" (`GET /api/folders`,
  general-folder-first per its existing ordering). On open, preselects/highlights the entry's
  current confirmed container. Confirm calls `PATCH /api/entries/[id]/move` and surfaces all of
  its documented response cases as user-facing text (200 success; 404 `Not found` / `Target goal
  not found` / `Target folder not found`; 401; 500) — no silent error swallowing.
- **New hook:** `features/echo/hooks/useMoveEntry.ts` — orchestrates opening the picker for a
  given entry id (fetches folders + current container in parallel via `supabase.auth.getSession()`
  → access token, same pattern as `createEntry`'s Echo-reflect call), confirming a move, and
  closing. Keeps `MoveEntryModal`/`EntryActionMenu` purely presentational per `features/CLAUDE.md`
  rule 3 (components receive data as props; only hooks/services touch Supabase or fetch).
- **`features/echo/services/echo-service.ts` additions:** `getEntryContainer` (direct
  `echo_entry_links` read, confirmed row only), `fetchFolders` (calls `GET /api/folders` with a
  bearer token, mirroring `requestEchoReflection`'s fetch-with-token convention rather than
  querying `echo_folders` directly, since it's the same server route Session 3 already built and
  auth-checks), `moveEntryRequest` (calls `PATCH /api/entries/[id]/move`, maps all response shapes
  to a typed `MoveEntryResult`).
- **`features/echo/store.ts`:** added `setEntryContainer` action — a **pure synchronous setter**
  (no `await`/service call inside the store), with all async orchestration living in the
  `useMoveEntry` hook. This follows `features/CLAUDE.md`'s services-pure / hooks-wire-services
  convention, and is **not** the same shape as `features/goals/store.ts`'s `deleteGoal` (which
  co-locates an `await deleteGoalRecord(...)` *and* `set(...)` inside the store action). Only the
  local-state map/`set` step is shared between them. It updates the moved entry's `goalId`/
  `goalTitle` or `folderId`/`folderName` locally (clearing the other pair) so the card reflects
  its new destination immediately without a full refetch.
- **`features/echo/types.ts`:** added optional `folderId?: string | null` and `folderName?: string`
  to `EchoEntry`. This is a feature-local type (`features/echo/types.ts`, VP-Product-owned per
  root `CLAUDE.md`'s file ownership, distinct from the CEO-owned top-level `types/` — confirmed
  before extending it) — not a schema or `types/*` L3 change. Entries don't currently carry
  `folder_id` from any fetch (`fetchEntries`/`getEntryById` still only join `goals`, not
  `echo_entry_links`); these fields are populated purely by the optimistic local update above,
  not by any query, and only after a successful folder move.
- **`features/echo/components/EchoScreen.tsx`:** `EchoEntryListCard` now takes an
  `onOpenMoveMenu` prop, renders `EntryActionMenu`, and shows a small pill for `entry.folderName`
  (falling back to the pre-existing `entry.goalTitle`) next to the relative-time/emotion row —
  the only visible container indicator added to the card. `EchoScreen` wires `useMoveEntry` and
  renders `MoveEntryModal` alongside the existing "Link a goal" `Modal`.
- **Explicitly out of scope, not touched:** `EchoDetailScreen.tsx`, `ReflectionCard.tsx` (per
  instruction), and the composer's existing "+Link goal" / "AI insight" controls + bottom-sheet
  modal (`EchoScreen.tsx`'s pre-existing picker, a separate net-new entry point from this one).
  No delete-entry or edit-entry backend route was created, even though Step 0 found both missing.
- Files touched: `features/echo/components/EntryActionMenu.tsx` (new),
  `features/echo/components/MoveEntryModal.tsx` (new), `features/echo/hooks/useMoveEntry.ts`
  (new), `features/echo/components/EchoScreen.tsx`, `features/echo/services/echo-service.ts`,
  `features/echo/store.ts`, `features/echo/types.ts`, `CHANGELOGCODEX.md`.
- Verification: `npx tsc --noEmit` clean before and after (zero new errors). Not yet manually
  exercised in a running app — flagged as the test plan on the PR.
- Shipped as PR #7 (`worktree-echo-folders-session4` → `main`), merged same session; branch
  deleted (remote + local) after merge.

### Added (2026-07-09 — Session 3: Folder CRUD API Routes, live-verified)
- **Pre-check (per session brief):** confirmed `echo_entry_links.echo_entry_id → echo_entries.id`
  is `ON DELETE CASCADE` (set in `005_echo_goal_links.sql`, carried through the `012` rename
  unchanged) — contrasts with the deliberate `ON DELETE RESTRICT` on `folder_id`
  (`013_echo_folders.sql`). This meant `delete_contents` only needs to delete `echo_entries`
  rows; the DB cascades their `echo_entry_links` rows automatically before the folder row is
  removed.
- **Routes added**, matching the existing `echo-links` route's conventions (local
  `getAuthContextFromRequest`, `sanitizeString`, flat `{error}`/`{data}` JSON shapes — the most
  recently-touched same-domain code at the time):
  - `GET/POST /api/folders` (`app/api/folders/+api.ts`) — list, create. `POST` rejects
    client-supplied `is_general` (server-controlled only).
  - `PATCH/DELETE /api/folders/[id]` (`app/api/folders/[id]+api.ts`) — rename, delete.
    Ownership + `is_general` checked before any mutation (403, not a silent no-op). Delete body
    `{ mode: 'delete_contents' | 'folder_only' }`.
  - `PATCH /api/entries/[id]/move` (`app/api/entries/[id]/move+api.ts`, new `entries` resource —
    none existed before) — body `{ target_type: 'goal' | 'folder', target_id }`. Verifies entry
    ownership, then target ownership (`isGoalOwnedByUser` / `getFolderByIdForUser`), before
    calling `moveEntryContainer`, which repoints only the entry's single *confirmed* link row —
    unconfirmed `ai_suggested` goal-link rows are left untouched by design.
- **Migration `015_folder_delete_functions.sql`:** two `SECURITY INVOKER` plpgsql functions,
  `delete_folder_reassign` and `delete_folder_with_contents`, so each `DELETE` mode runs as one
  atomic transaction (supabase-js has no multi-statement transaction support over PostgREST).
  Both re-verify folder ownership/`is_general` internally via `auth.uid()` on top of RLS.
- **Supporting lib/db changes:** `lib/db/echo-folders.ts` (new — folder CRUD +
  `getOrCreateGeneralFolderId`, `deleteFolderReassign`, `deleteFolderWithContents`);
  `lib/db/echo-entry-links.ts` (`isEntryOwnedByUser`, `moveEntryContainer`); `lib/db/goals.ts`
  (`isGoalOwnedByUser`); `types/echo-folder.ts` (new); `.env.example`
  (`SUPABASE_SERVICE_ROLE_KEY`, server-only, documented). A `createServiceRoleClient()` was
  first added directly to `lib/db/client.ts`, then extracted mid-session into its own
  `lib/db/service-client.ts` to close a client-bundle leak risk — see the "Service role key
  leaking into client web bundle" entry below for that fix's own detail.
- **Live verification (real dev server + real JWTs, not tsc-only):** ran `expo start --web`
  and hit the actual route code over HTTP with two real Supabase test users (created/deleted
  via the admin API for this run only), cross-checking DB state directly via a service-role
  client rather than trusting API responses alone.
  - **Bug found and fixed:** migration `015` had never been applied to the live project — only
    `001`–`014` were tracked in `supabase_migrations.schema_migrations` — so both new RPCs were
    missing (`PGRST202`) and every `DELETE /api/folders/[id]` call 500'd. Applied the migration
    directly via `psql` (using `SUPABASE_DB_PASSWORD`, newly added to `.env.local` for this),
    then recorded it in the tracking table. Re-confirmed both functions are `SECURITY INVOKER`
    (`prosecdef = f`) as designed.
  - **23/23 checks passed** after the fix: `delete_contents` cascade (entries, links, and
    folder row all confirmed gone via direct query); `folder_only` reassignment (entries
    survived, all links' `folder_id` confirmed *equal to* the resolved General folder id, not
    just non-null; original folder row gone); General-folder rename/delete guards (403 on all
    three route paths, DB confirms untouched); cross-user ownership on folder rename/delete
    (404, DB confirms untouched); cross-user ownership on the move endpoint — moving another
    user's entry, moving into another user's folder, and moving into another user's goal all
    rejected with 404, DB confirms untouched, with a positive control (same-user move) verified
    to still succeed (200) so the endpoint isn't just failing closed universally; single call
    site for `get_or_create_general_folder` (`app/api/folders/[id]+api.ts:162`) confirmed to
    source `p_user_id` exclusively from `auth.userId` (server-side session), never the request
    body.
  - Test users, test folders/entries, and the throwaway verification/probe/cleanup scripts
    used for this run were all removed afterward; dev server stopped.
- Files touched: `app/api/folders/+api.ts` (new), `app/api/folders/[id]+api.ts` (new),
  `app/api/entries/[id]/move+api.ts` (new), `supabase/migrations/015_folder_delete_functions.sql`
  (new, applied live), `lib/db/echo-folders.ts` (new), `lib/db/echo-entry-links.ts`,
  `lib/db/goals.ts`, `types/echo-folder.ts` (new), `.env.example`, `CHANGELOGCODEX.md`.
- Verification: `npx tsc --noEmit` clean throughout. Live HTTP + direct-DB verification per
  above (23/23 passed).
- Out of scope, not touched: `handle_new_user()`, the migration squash, any frontend/UI wiring
  for folders (Session 4+).

### Fixed (2026-07-09 — lib/db/CLAUDE.md was a stray duplicate of components/CLAUDE.md)
- **What it was:** `lib/db/CLAUDE.md` contained component/theming content (NativeWind rules,
  GoalCard/VaultItemCard/etc. component list, BRT hex colors) instead of directory-scoped
  context for `lib/db/`. `git log --follow` showed this wasn't a move/rename gone wrong — the
  file was created from scratch in commit `c27ecf6` (Add Vault route and milestone-tap
  navigation) as a verbatim copy-paste of the already-existing `components/CLAUDE.md`,
  mislabeled from the moment of creation (its header still read
  `# components/CLAUDE.md — Component Rules`). Two later commits (`54a4c68`, `d24932e`)
  applied identical color-token fixes to both files — a grep-replace pattern run across all
  `CLAUDE.md` files without checking each file's actual scope, which is what kept the
  duplicate looking "maintained" instead of surfacing it as dead weight.
- **Fix:** discarded the copied content; wrote a real `lib/db/CLAUDE.md` covering
  `client.ts`/`service-client.ts`'s anon-vs-service-role split, each service module
  (`goals.ts`, `spaces.ts`, `vaults.ts`, `echo-folders.ts`, `echo-entry-links.ts`,
  `embeddings.ts`), and the row-mapping/RLS conventions used throughout. `components/CLAUDE.md`
  was untouched — it already had correct, currently-maintained content (in fact slightly ahead
  of what had been copied, e.g. the `#1A1F1C` near-black fix in `439bb08`).
- **Follow-up cleanup — audited all CLAUDE.md files repo-wide** to check for the same pattern
  elsewhere:
  - `CLAUDE.md` (root) is a symlink to `docs/CLAUDE.md` — the two being byte-identical across
    history is by design, not a duplicate.
  - `components/CLAUDE.md`, `features/CLAUDE.md`, `supabase/CLAUDE.md` — scope matches their
    directories.
  - `lib/ai/CLAUDE.md` — scope correct, but references `vault-insights.ts`, which has never
    existed in git history (root `CLAUDE.md`/`docs/CLAUDE.md` references it too). Stale
    aspirational content, not a duplication issue — flagged, not fixed this pass.
  - `supabase/CLAUDE.md` — says "Next new migration: 013" but 013–015 already exist. Staleness,
    not duplication — flagged, not fixed this pass.
  - `types/CLAUDE.md` — has a stray paragraph (added in commit `26a7e4b`) entirely about
    `components/ui/Modal.tsx`'s confirm/cancel API, instructing that it be documented in
    "CLAUDE.md for components." It was never acted on: `components/CLAUDE.md` has no Modal
    documentation and `Modal.tsx` has no such comment. Misplaced content, not duplication —
    flagged, not fixed this pass (out of scope for this session; needs its own pass).
  - Added a short scope-guard note to `docs/CLAUDE.md` (root `CLAUDE.md`'s symlink target),
    under "File Ownership": nested CLAUDE.md files are directory-scoped and must not be edited
    via blanket find/replace across all CLAUDE.md files — repo-wide patterns (like a
    color-token rename) need to be applied per-file, scope-checked, not copy-propagated.
- Files touched: `lib/db/CLAUDE.md`, `docs/CLAUDE.md`, `CHANGELOGCODEX.md`.

### Fixed (2026-07-09 — Service role key leaking into client web bundle)
- **Pre-check for Session 3 live verification** (`SUPABASE_SERVICE_ROLE_KEY` newly added to
  `.env.local` to unblock test-user creation) found `createServiceRoleClient()` shipping into
  the client web bundle. Root cause: `lib/db/client.ts` mixed client-safe exports (`supabase`,
  `createAuthedClient`, `isDatabaseConfigured`) with the server-only
  `createServiceRoleClient()` in one module. Metro doesn't tree-shake at export granularity —
  any client-side import from the file (`supabase`/`createAuthedClient`) pulled the whole
  module graph, including the server-only function body, into
  `client/_expo/static/js/web/entry-*.js`.
- **Verified before fixing:** `.env.local` is gitignored (`.env*.local`); no `EXPO_PUBLIC_`
  variant of the key exists anywhere in the repo; the only importer of
  `createServiceRoleClient` was `lib/db/echo-folders.ts` → `getOrCreateGeneralFolderId`,
  reachable solely from three server-only `+api.ts` routes (`app/api/folders/+api.ts`,
  `app/api/folders/[id]+api.ts`, `app/api/entries/[id]/move+api.ts`), never from a
  screen/component/hook. Ran `npx expo export --platform web` and grepped the actual
  `client/_expo/static/**` output (not the server bundle): the literal string
  `SUPABASE_SERVICE_ROLE_KEY` and the `service_role` substring were present (2 hits, in the
  function source), but the **actual key value was never present** (zero matches) — the
  browser's `process.env` polyfill only sets `NODE_ENV`, so the runtime lookup resolves to
  `undefined` and the existing fail-closed guard (throws if the key is missing) meant nothing
  ever actually leaked. Still a real gap: safety depended entirely on that polyfill behavior
  rather than the module boundary itself.
- **Fix:** moved `createServiceRoleClient()` out of `lib/db/client.ts` into a new
  `lib/db/service-client.ts` — self-contained (derives its own `supabaseUrl` from
  `EXPO_PUBLIC_SUPABASE_URL` rather than importing it, so it has zero coupling back to
  `client.ts`), fail-closed guard and server-only comment carried over unchanged. Updated the
  sole importer, `lib/db/echo-folders.ts`, to pull `supabase` from `./client` and
  `createServiceRoleClient` from `./service-client`. `lib/db/client.ts`'s other exports
  untouched — pure move, not a refactor.
- **Re-verified after the fix:** rebuilt with `npx expo export --platform web`; grepped
  `client/_expo/static/**` for `SUPABASE_SERVICE_ROLE_KEY`, the actual key value, and
  `service_role` (case-insensitive) — zero matches on all three (previously 2 hits on the
  first and third). Confirmed the three `+api.ts` routes still resolve correctly (only
  `app/api/folders/[id]+api.ts` calls `getOrCreateGeneralFolderId`, via `deleteFolderReassign`'s
  `folder_only` mode; `move+api.ts` only ever used `getFolderByIdForUser`, unaffected).
- **Out of scope, not touched:** test-user creation and the rest of Session 3 live
  verification — paused per instruction until this came back clean; no other `lib/db/client.ts`
  exports.
- Files touched: `lib/db/service-client.ts` (new), `lib/db/client.ts`, `lib/db/echo-folders.ts`,
  `CHANGELOGCODEX.md`.
- Verification: `npx tsc --noEmit` clean. Client bundle grep clean (see above).

### Fixed (2026-07-01 — EchoScreen entry rows now navigate to detail view)
- `EchoEntryListCard` in `features/echo/components/EchoScreen.tsx` had no tap handler, unlike
  `ActivityFeed.tsx` and `EchoTrail.tsx`, which both already navigate to `/echo/[id]` via
  `router.push(\`/(app)/echo/${id}\` as never)` (imported from `expo-router`). Applied the same
  pattern: added `router` to the existing `expo-router` import, wrapped the row's outer `View` in
  a `Pressable` (`onPress` → `router.push(\`/(app)/echo/${entry.id}\` as never)`, opacity dims to
  0.85 while pressed, matching `ActivityFeed.tsx`'s press style). No data fetching, sorting,
  filtering, or visual output changes — the inner `View`/content markup is untouched, only
  wrapped. `npx tsc --noEmit` passes with no errors.

### Added (2026-07-01 — Avatar menu replaces sidebar Account/Settings/Log out)
- **Step 0 audit findings:**
  - Sidebar (`components/layout/Sidebar.tsx`) previously had zero user-data access — no
    display_name, no avatar anywhere in the file. Traced where that data could plausibly live:
    `useAuthStore` (`features/auth/store.ts`) declares `user: AuthUser | null` and
    `profile: Profile | null` with setters, but a repo-wide grep confirmed neither is ever
    set anywhere — dead, always-null state. The only place that actually fetched
    `display_name`/`avatar_url` was the old `app/(app)/account.tsx` route, via its own
    `supabase.auth.getSession()` → `access_token` → `fetch('/api/profile', ...)`. All three new
    components (`AvatarMenu`, `AccountModal`, `SettingsModal`) fetch profile data themselves
    via that same pattern, since no populated store exists to read from.
  - `expo-image-picker` was not installed — flagged and stopped per instruction; user confirmed
    install. Added via `npx expo install expo-image-picker` (`~55.0.21`, SDK-matched). First use
    of this package in the repo.
  - No Supabase Storage upload example existed anywhere in the codebase (`storage.from(...)` /
    `.upload(...)` grepped zero hits) despite the `avatars` bucket + RLS policies existing since
    migration 011. Upload code in `AccountModal.tsx` written fresh against the documented
    Supabase JS SDK API (`fetch(uri) → blob() → .storage.from('avatars').upload(path, blob, ...)`,
    the standard Expo + Supabase pattern for RN).
  - Image component in use: React Native's core `Image` (from `'react-native'`), confirmed via
    `app/index.tsx`. `expo-image` is not a dependency.
  - Modal pattern: `components/ui/Modal.tsx` — RN `Modal` (`transparent`, `animationType="fade"`)
    wrapping a centered NativeWind-styled card, with optional cancel/confirm footer buttons.
    Used directly for `AccountModal` (cancel/confirm shape fits) and `SettingsModal` (close-only
    shape fits). The avatar dropdown itself doesn't fit that shape (menu list + required
    tap-outside-to-dismiss, which the generic `Modal` doesn't support — its outer wrapper is a
    plain `View`, not a `Pressable`) — built as its own transparent `Modal` in `AvatarMenu.tsx`
    with a `Pressable` backdrop (`onPress` → close) and a nested no-op `Pressable` around the
    card content to absorb taps so they don't bubble to the backdrop.
  - Flagged the pre-existing `app/(app)/account.tsx` route (full-screen, display_name/timezone
    only, would become an orphaned-but-still-reachable-by-URL duplicate once the sidebar stopped
    linking to it) — user confirmed deletion. **Deleted** `app/(app)/account.tsx`.
- **Added `components/ui/Avatar.tsx`:** shared circular avatar renderer + `getInitials()` helper
  (first letter of up to first two words, uppercase). Renders the remote image via RN `Image`
  when `avatarUrl` is set, otherwise a forest-green circle with initials. Used by `AvatarMenu`
  (36px trigger, 44px in the dropdown header) and `AccountModal` (72px, with camera-icon overlay).
- **Extended `components/ui/Input.tsx`** (previously unused anywhere in the codebase — safe,
  non-breaking to extend) with optional `multiline` and `autoCapitalize` props, needed for the
  Account modal's `bio` field.
- **Added `components/layout/AvatarMenu.tsx`:** replaces the three static sidebar rows
  (Account / Settings / Log out) with a single pressable avatar (36px, same row padding as the
  removed items to match visual weight). Fetches `{ display_name, avatar_url }` from
  `GET /api/profile` on mount (silent failure — falls back to initials/empty, non-blocking,
  matches the codebase's existing "profile fetch never blocks chrome" convention). Tapping opens
  a centered dropdown modal: avatar (44px) + display_name at top, then `Profile` → opens
  `AccountModal`, `Settings` → opens `SettingsModal`, a divider, then `Log out` in red. Tapping
  outside the card dismisses the menu.
- **Added `components/layout/AccountModal.tsx`:** header "Account". 72px avatar with a
  bottom-right camera-icon overlay; tapping it requests media-library permission
  (`ImagePicker.requestMediaLibraryPermissionsAsync`), launches
  `ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8, allowsEditing:
  true, aspect: [1,1] })` (non-deprecated array form of `mediaTypes` — the enum
  `MediaTypeOptions` is `@deprecated` in the installed `expo-image-picker` version), uploads the
  selected image to `avatars/{user_id}/avatar.jpg` via the already-authenticated client-side
  `supabase` singleton (client components carry a live persisted session already — unlike the
  server-side RLS gap flagged in `OUTSTANDING.md` for `reflect+api.ts`, which is specifically an
  API-route-using-the-client-singleton problem), then immediately `PATCH`es `avatar_url` with
  the resulting public URL — this happens on image selection, independent of the Save button.
  Below the avatar: `display_name`, `bio` (multiline, optional), `timezone` (plain text input,
  no picker — v1 per spec), `interests_user` (comma-separated text, split/trimmed/filtered to a
  `string[]` on save, joined with `, ` on load). Cancel dismisses without saving. Save `PATCH`es
  `display_name`/`bio`/`timezone`/`interests_user` via the profile route, dismisses on success,
  shows an inline error on failure. Never renders or sends `interests_ai`,
  `intelligence_enabled`, `character_profile`, `context`, or `onboarding_complete`.
- **Added `components/layout/SettingsModal.tsx`:** header "Settings". Single `Switch` bound to
  `intelligence_enabled`, fetched from `GET /api/profile` on open. Toggling immediately `PATCH`es
  `intelligence_enabled`; shows an `ActivityIndicator` in place of the switch during the request;
  reverts the toggle to its previous value if the `PATCH` fails or the session token is missing.
  Muted caption below: "When off, Echo entries are saved without AI analysis."
- **Updated `components/layout/Sidebar.tsx`:** removed `handleSignOut`, the `Account` row, the
  disabled `Settings` placeholder row (which previously had no handler at all), and the `Log out`
  row. Replaced all three with `<AvatarMenu />`. Removed now-unused `supabase` and
  `clearAllStores` imports (both moved into `AvatarMenu.tsx`). No other sidebar logic touched —
  nav items (`Goals`/`Echo`/`Constellation`/`Explore`) unchanged.
- **Log out sequence** (`AvatarMenu.tsx handleSignOut`), per spec, in order: `clearAllStores()` →
  `supabase.auth.signOut({ scope: 'local' })` (previously plain `supabase.auth.signOut()` with no
  scope, in the old `Sidebar.tsx` handler — this is an intentional behavior change per this
  session's explicit instructions) → no avatar-cache clear (see `OUTSTANDING.md`, no API exists
  for core RN `Image`) → `router.replace('/(auth)/login')` (same hard-reset-to-login pattern as
  before, clearing the stack so back-navigation can't expose authenticated content).
- **Out of scope, not touched:** any route/API beyond `profile/index+api.ts`, Echo/Goal/Vault
  routes or screens, `handle_new_user()`/triggers, `touchLastSummarizedAt` or any other
  pre-existing `OUTSTANDING.md` item, the reflect route or its retry logic.
- Flagged to `OUTSTANDING.md`: `interests_user` comma-separated input (v1 only, tag/chip input is
  the correct long-term pattern), avatar cache-clearing (no API available for core RN `Image`),
  and `expo-image-picker` as a new dependency (first use in the repo).
- Files touched: `components/ui/Avatar.tsx` (new), `components/ui/Input.tsx`,
  `components/layout/AvatarMenu.tsx` (new), `components/layout/AccountModal.tsx` (new),
  `components/layout/SettingsModal.tsx` (new), `components/layout/Sidebar.tsx`,
  `app/(app)/account.tsx` (deleted), `package.json` / `package-lock.json` (added
  `expo-image-picker`), `OUTSTANDING.md`, `CHANGELOGCODEX.md`.
- Verification: `npx tsc --noEmit` clean.

### Added (2026-07-01 — Profile GET/PATCH route, intelligence_enabled gate on reflect)
- **Step 0 audit findings (see below for full detail) blocked literal Step 2 as drafted; user chose to proceed with a modified approach — flagged for a future architecture/audit session:**
  - `app/api/echo/reflect+api.ts` does **not** follow the canonical `getAuthContext` (`lib/api/auth.ts`) + `createAuthedClient` (`lib/db/client.ts`) pattern used by `app/api/profile/index+api.ts`. It has its own duplicate inline `getAuthContextFromRequest` (identical logic to `getAuthContext`) and, for the `touchLastSummarizedAt` write, uses the raw `supabase` singleton from `lib/db/client.ts` (an anon-key client built for RN client-side session persistence) instead of a per-request authed client — meaning that write runs without the caller's JWT forwarded, so RLS scoped to `auth.uid()` likely evaluates as unauthenticated and silently affects 0 rows. **Not fixed this session per explicit user instruction** — left untouched, logged to `OUTSTANDING.md` as a separate RLS audit item.
  - `ai_status` on `echo_entries` was never written server-side in `reflect+api.ts` — it's written entirely client-side in `features/echo/services/echo-service.ts` (`createEntry`). The reflect route also had no `echo_entry_id` in its request body, so it had no way to scope a DB write to a specific row.
- **Resolution (user-approved):** added `echo_entry_id?: string` to `ReflectRequestBody` in `reflect+api.ts`; wired it through `requestEchoReflection()` and its call site in `createEntry()` (now passes `insertedEntry.id`).
- Added the `intelligence_enabled` gate in `reflect+api.ts`: after auth is established and before any Haiku call, reads `profiles.intelligence_enabled` via `createAuthedClient(auth.accessToken)`. If `false`: updates `echo_entries.ai_status = 'not_requested'` for the given `echo_entry_id` (via the authed client, RLS-scoped), returns `200` with `{ reflection: null, summarized: false, disabled: true }`, does not call Haiku, does not touch `retry_count`. If `true`: existing logic runs unchanged.
- **Second inconsistency found and fixed during Step 2 (user-approved):** `createEntry()`'s existing failure branch (`if (!reflectPayload || !reflectPayload.summarized || !reflectPayload.reflection)`) could not distinguish "intelligence disabled" from "Haiku actually failed" — both produce `summarized: false` — so it was about to immediately overwrite the fresh `ai_status = 'not_requested'` write with `ai_status = 'failed', retry_count: 1`, which would also cause the disabled entry to get swept into `reconcile+api.ts`'s retry queue (calling Haiku anyway, defeating the gate). Fixed by adding `disabled?: boolean` to the client-side `ReflectPayload` type and a new guard in `createEntry()`: `if (reflectPayload?.disabled) return { status: 'saved', entry: insertedEntry };` placed before the existing failure branch. No other ai_status transition logic changed.
- Expanded `app/api/profile/index+api.ts` (pre-existing file, previously only `display_name`/`timezone`):
  - `GET`: now returns `display_name, bio, avatar_url, interests_user, timezone, intelligence_enabled`. Excludes `interests_ai`, `character_profile`, `context`, `onboarding_complete`, all timestamps.
  - `PATCH`: accepts the same 6 fields with validation (`display_name`/`avatar_url` non-empty trimmed strings, `bio` any string including empty, `interests_user` array, `intelligence_enabled` boolean). Update payload is built field-by-field from an explicit allowlist (never spread from the raw request body), so `interests_ai`/`character_profile`/`context`/`onboarding_complete`/`id`/timestamps are structurally impossible to write via this route regardless of what a client sends. Scoped to `auth.uid()` via `createAuthedClient`.
- Updated `Profile` type in `features/auth/types.ts`: added `avatar_url: string | null`, `bio: string | null`, `intelligence_enabled: boolean`. Did **not** add `interests_ai` — schema-only, no client-side type.
- **Out of scope, not touched:** any UI/component, other Echo routes, Goal routes, Vault routes, `handle_new_user()`/triggers, avatar upload itself, `touchLastSummarizedAt`'s RLS gap (see above).
- Files touched: `app/api/profile/index+api.ts`, `app/api/echo/reflect+api.ts`, `features/echo/services/echo-service.ts`, `features/auth/types.ts`, `CHANGELOGCODEX.md`.
- Verification: `npx tsc --noEmit` clean.

### Added (2026-07-01 — Profiles account expansion + avatars bucket)
- Added `supabase/migrations/011_profiles_account_expansion.sql`:
  - `RENAME COLUMN public.profiles.interests TO interests_user` (disambiguates from the new system-inferred column).
  - Added `avatar_url text`, `bio text`, `interests_ai jsonb` (all nullable), and `intelligence_enabled boolean NOT NULL DEFAULT true` to `public.profiles`.
  - Column comments documenting `interests_user` (Account-screen editable), `interests_ai` (schema-only, no writer yet — must not appear in any client-writable API route), and `intelligence_enabled` (reflect API should skip Haiku + set `ai_status = not_requested` when false — not wired in this session).
  - Created the `avatars` public storage bucket (`storage.buckets` insert) with 4 RLS policies on `storage.objects`: public `select`, and owner-scoped `insert`/`update`/`delete` gated on `(storage.foldername(name))[1] = auth.uid()::text`. No prior bucket/policy pattern existed in this repo to copy from — followed standard Supabase storage RLS conventions instead.
- **Step 0 audit (full codebase search for `profiles.interests` reads/writes) found zero live call sites** — no API route, hook, Zustand store, or component selects/inserts/updates/reads the column anywhere. The only match was a mirrored type field.
- **Step 2 code update:** renamed `Profile.interests` → `Profile.interests_user` in `features/auth/types.ts` (the sole type reference to the DB column). Re-verified post-rename: zero remaining `.interests` property-access sites anywhere in the codebase.
- **Flagged, not renamed (false positives caught during audit — confirmed unrelated to `profiles.interests`, left untouched):**
  - `features/profile/types.ts:4` (`CharacterProfile.interests: string[]`) — models a key inside the separate `character_profile` JSONB blob (Intelligence feature), not the `profiles.interests` column.
  - `lib/ai/isProfileSufficient.ts:15` and `lib/ai/prompts/intelligence.ts:61` (`raw['interests']`) — both read the same `character_profile` JSONB key, unrelated to the renamed column.
  - `public.interests` (table, `001_core_schema_and_rls.sql:235`, FK'd in `002_echo.sql`) — a wholly separate thorn-pattern table with the same name; not touched.
- **Out of scope, not touched this session:** `handle_new_user()` / `on_auth_user_created` (fixed manually via SQL Editor prior to this session per A1 audit), Echo routes, Goal routes, any screen/component beyond the one profile type. `interests_ai` was added schema-only — no read/write path wired to it anywhere.
- Files touched: `supabase/migrations/011_profiles_account_expansion.sql` (new), `features/auth/types.ts`, `CHANGELOGCODEX.md`.
- Verification: `npx tsc --noEmit` clean. `npx supabase db push` applied successfully to live Supabase (along with two previously-unpushed migrations, 009 and 010).

### Fixed (2026-06-26 — useVault API-layer bypass)
- Rewired `features/goals/hooks/useVault.ts` to call API routes instead of `lib/db/vaults.ts` service functions directly from the client.
- **Auth pattern source:** Copied from `features/goals/hooks/useActivity.ts` — `supabase.auth.getSession()` called per operation, guarded on `session?.access_token`, `Authorization: Bearer ${session.access_token}` header on every fetch.
- **Operations rewired (5):**
  - `refresh()` → `GET /api/vaults/[goalId]` (response shape: `{ vault, items }`)
  - `addNote()` → `POST /api/vaults/[goalId]` (response shape: `{ item }`)
  - `addLink()` → `POST /api/vaults/[goalId]` (response shape: `{ item }`)
  - `updateItem()` → `PUT /api/vaults/items/[itemId]` (response shape: `{ item }`)
  - `removeItem()` → `DELETE /api/vaults/items/[itemId]` (response shape: `{ success: true }`)
- **Removed:** `lib/db/vaults.ts` imports (`getVaultWithItems`, `createVaultItem`, `updateVaultItem`, `deleteVaultItem`), `userIdRef` (userId no longer used client-side), direct `supabase.auth.getSession()` session caching pattern (only supabase import kept for per-call `getSession()`).
- **Title validation fix:** `POST /api/vaults/[goalId]+api.ts` — changed `title` from `sanitizeString` (required, throws on empty) to `sanitizeOptionalString` (accepts null/empty, returns null). Final rule: **title is optional for all vault item types** — no item type (`note`, `link`, `document`, `insight`, `action_update`) requires a non-empty title at the schema level (`VaultItem.title: string | null`).
- **Downstream title-rendering audit (VaultItemCard.tsx):** 5 access sites found, all already null-safe:
  - `NoteCard` line 27: `deriveTitle()` — falls back to first 8 words of content, then `'Untitled'`
  - `NoteCard` lines 40/52/58: `item.title ?? ''` — safe empty string for TextInput state
  - `LinkCard` line 176: `item.title ?? domain ?? item.metadata?.url ?? 'Saved link'` — safe chain
  - `ActionUpdateCard` line 295: `item.content ?? item.title ?? ''` — safe chain
  - `FallbackCard` line 328: `item.title ?? item.content ?? 'Unknown item'` — safe chain
  - `ActivityFeed.tsx` `vault_item_added` case: renders static string `"Added an item to Vault"` — does not access `item.title` at all.
  - **Zero UI patches needed.**
- **Ownership pre-check tightening confirmed:** `removeItem()` now routes through `DELETE /api/vaults/items/[itemId]`, which calls `getVaultItemByIdForUser` before deletion. The previous direct `deleteVaultItem` call bypassed this ownership check. Intentional tightening per "404 not 403" principle — non-owners now receive 404 instead of silently succeeding.
- Files touched: `features/goals/hooks/useVault.ts`, `app/api/vaults/[goalId]+api.ts`, `CHANGELOGCODEX.md`.
- Verification: `npx tsc --noEmit` clean.

### Fixed (2026-06-26 — BRT read fallback chain)
- Applied `brt_user ?? brt_ai ?? brt` read-priority rule to all 5 consumer sites that access BRT values directly. This is forward-compatible scaffolding: produces identical results on all live rows today (brt_user always NULL; brt_ai equals brt when non-NULL) while correctly prioritising user overrides once brt_user write paths ship.
- **Mapper sites (4):**
  - `features/echo/services/echo-service.ts`: added `brt_ai`, `brt_user` to `DbEchoEntry` type; updated `mapEntry` line 43. Query uses `*` — no SELECT change needed.
  - `lib/db/echo-goal-links.ts`: added `brt_ai`, `brt_user` to `DbEchoEntryRow` type; updated `mapEchoEntry` line 60; added `brt_ai, brt_user` to named SELECT in `getEchoEntriesForGoal`.
  - `lib/db/goals.ts:363` (`getActivityByGoalId` echo_entry path): added `brt_ai`, `brt_user` to `DbEchoEntryRow` type and to the `.select()` at line 347; updated inline mapper.
  - `lib/db/goals.ts:506` (`getActivityByGoalId` echo_linked path): added `brt_ai`, `brt_user` to `DbEchoEntryForLinkRow` type and to the `.select()` at line 495; updated inline mapper.
- **Direct-query site (1):**
  - `features/goals/services/goal-service.ts:227` (`fetchGoalSignals`): added `brt_ai, brt_user` to SELECT; updated cast type; resolved priority into `brtValue` before storing in Map. Lines 241-242 unchanged — they read `entry.brt` which now holds the resolved value.
- **Untouched downstream (8 sites inherit fix automatically):** `EchoDetailScreen.tsx:55`, `ActivityFeed.tsx:38`, `EchoTrail.tsx:97`, `useEchoTrail.ts:53` all consume `EchoEntry.brt` or `ActivityItem.brt` resolved by the fixed upstream mappers. No changes needed.
- **OUT OF SCOPE (deferred):** `lib/db/embeddings.ts` / `match_echo_entries()` — semantic search not in production; requires DB-level function rewrite. Tracked separately.
- **Dead code cleanup:** Deleted `lib/ai/prompts/summarizer.ts` — zero importers confirmed; pipeline that called it was already deleted.
- Files touched: `features/echo/services/echo-service.ts`, `lib/db/echo-goal-links.ts`, `lib/db/goals.ts`, `features/goals/services/goal-service.ts`, `lib/ai/prompts/summarizer.ts` (deleted), `CHANGELOGCODEX.md`.
- Verification: `npx tsc --noEmit` clean.

### Added (2026-06-26 — Echo ai_status column)
- Added `ai_status text NOT NULL DEFAULT 'not_requested' CHECK (ai_status IN ('not_requested', 'pending', 'completed', 'failed'))` to `echo_entries` via `supabase/migrations/009_echo_ai_status.sql`. Backfills `completed` where `summarized = true`; all other pre-existing rows stay `'not_requested'` (pre-squash rows had no way to distinguish failed from not-requested).
- Wired writes in `features/echo/services/echo-service.ts`:
  - INSERT payload: `ai_status: aiInsightRequested ? 'pending' : 'not_requested'` — covers both branches atomically at insert time, no separate round-trip.
  - Catch block (requestEchoReflection throws — rate-limit or other): fire-and-forget UPDATE `'failed'` before returning `rate_limited` or `saved_without_summary`.
  - `!reflectPayload.summarized` guard (covers reflect+api.ts non-rate-limit failure path, which returns `ok:true, summarized:false`): fire-and-forget UPDATE `'failed'`.
  - Success UPDATE: `ai_status: 'completed'` added to the existing `summarized: true` UPDATE — no extra round-trip.
  - `updateError` guard (AI call succeeded but DB UPDATE failed): fire-and-forget UPDATE `'failed'`.
- `summarized` column untouched — still written and read by reconcile. `ai_status` is additive.
- reflect+api.ts not modified — it has no entry ID in its request contract and cannot write ai_status directly. All failure paths propagate back to echo-service.ts where the entry ID is available.
- Files touched: `supabase/migrations/009_echo_ai_status.sql` (new), `features/echo/services/echo-service.ts`, `CHANGELOGCODEX.md`.
- Verification: `npx tsc --noEmit` clean.

### Fixed (2026-06-26 — Echo reconcile auth fix)
- Fixed silent 401 swallow on the dashboard's mount-time Echo reconcile call in `app/(app)/dashboard.tsx`. The bare `fetch('/api/echo/reconcile', { method: 'POST' })` sent no `Authorization` header, so `reconcile+api.ts:getAuthContext()` returned null and the route returned 401. Because `fetch()` resolves normally on HTTP errors, the `.catch()` never fired and the 401 was silently swallowed with zero log output.
- Replaced the promise chain with an async function matching the established `DueTodayZone` / intelligence-fetch pattern: calls `getAccessToken()` (throws if session not ready → fetch is skipped), sends `Authorization: Bearer <token>`, and checks `res.ok` after await — logging a distinct `console.warn(`Echo reconcile: server responded with status ${res.status}`)` on non-ok responses. Network/auth errors are caught and logged via a separate `console.warn('Echo reconcile: fetch error:', err)`. The `reconcileInFlight` ref reset is preserved in `finally`.
- Code trace: `getAccessToken()` → `supabase.auth.getSession()` → JWT sent as `Authorization: Bearer` → `reconcile+api.ts:getAuthContext()` reads the header, validates via `supabase.auth.getUser(token)`, returns `{ userId, accessToken }` → `if (!auth)` gate passes → reconciliation proceeds.
- Files touched: `app/(app)/dashboard.tsx`, `CHANGELOGCODEX.md`.
- Verification: `npx tsc --noEmit` clean.

### Added (2026-06-22 — Block 1: API-layer goal creation + mode fix)
- Created `lib/api/auth.ts` (`getAuthContext`) and `lib/api/contracts.ts` (`ApiResponse<T>`
  envelope) as the first routes on the new shared API auth/contract pattern.
- Created `app/api/goals/index+api.ts` (`POST /api/goals`), routing AI-finalized goal
  persistence through `createGoalWithMeasurables` under an authed Supabase client instead of
  calling the DB layer directly from `app/goals/create.tsx`.
- Restored `mode: 'commitment' as const` in `lib/db/goals.ts` (`mapAiGoalDataToDbInserts`),
  reverting the unreviewed H3 cleanup pass that dropped it and caused a NOT-NULL insert
  failure in production.
- Added `supabase/migrations/026_goals_mode_drop_exploration.sql`, tightening
  `goals_mode_check` to `mode = 'commitment'` only ('exploration' was dead — never written or
  read anywhere in the app).
- Files touched: `lib/api/auth.ts` (new), `lib/api/contracts.ts` (new),
  `app/api/goals/index+api.ts` (new), `lib/db/goals.ts`, `app/goals/create.tsx`,
  `supabase/migrations/026_goals_mode_drop_exploration.sql` (new).
- Verification: `POST /api/goals` returns 201 with a real `goalId`; DB row confirms
  `mode: 'commitment'` persists; `npx tsc --noEmit` clean.
- Closes H3 (see Cleanup, 2026-04-08, below) — that entry is now marked CLOSED.

### Changed (2026-06-19 — Block 0 Closeout: Verification and blocker cleanup)
- Session `Block 0 Closeout — Verification and blocker cleanup`: audited the current Block 0.1 callback state, Block 0.2 RLS hardening migration and four audited routes, Block 0.3 Echo reconcile route, `package.json` scripts, and the known verification blockers before making any edits. Confirmed `app/(auth)/callback.tsx` exists, `app/auth/callback.tsx` is absent, signup still redirects to `https://oharaai.vercel.app/callback`, the four audited actions/goals routes still use `createAuthedClient(accessToken)` for their Supabase queries, and `app/api/echo/reconcile+api.ts` still imports the canonical helper from `lib/db/client.ts`.
- Fixed the verification blockers with the smallest safe changes: closed the missing header wrapper `View` in `app/about.tsx` so TypeScript and Expo web bundling can parse the page again; tightened `expo-router` `Link` prop typing in `app/about.tsx` and `app/index.tsx`; registered the existing root `about` screen in `app/_layout.tsx`; added a targeted `Href` cast on the two `/about` links because the generated Expo typed-route file still omits that route in this repo; and repointed `expo.web.favicon` in `app.json` from missing `./assets/images/favicon.png` to the existing `./assets/images/icon.png` instead of inventing new branding.
- Files touched: `app/_layout.tsx`, `app/about.tsx`, `app/index.tsx`, `app.json`, `CHANGELOGCODEX.md`.
- Verification results: `npx tsc --noEmit` passes after the JSX and typed-route fixes; `npx expo export -p web` passes after the JSX and favicon fixes; `npx supabase migration list` shows local and remote are aligned through migration `025`; `npx supabase db push` reports `Remote database is up to date`; there is still no lint script in `package.json`; repo audit still shows no live app-code references to `/auth/callback`; Block 0.2 route state and Block 0.3 Echo reconcile state remain intact from source review after the blocker fixes.
- Supabase status: the repo is linked to project `rrgiqemscnyaqkculnmb`, live CLI access is available from this machine, and `025_action_logs_rls_hardening.sql` is already applied remotely, so no new migration was pushed during this closeout.
- Manual tests still required: signup email confirmation landing on `/callback`; authenticated `POST /api/echo/reconcile` returning `{ reconciled, failed }`; unauthorized `POST /api/echo/reconcile` returning `401`; authenticated `/api/goals/activity` and `/api/goals/complete-measurable` exercising correctly against live RLS.
- Remaining risk: live Supabase migration/application state and runtime route behavior still require environment-backed verification even though local typecheck and web export blockers are now cleared, and the generated Expo typed-route file still appears stale around `/about` despite the route registration fix.

### Added (2026-06-19 — Block 0.2: Anon-client RLS hardening)
- Added `supabase/migrations/025_action_logs_rls_hardening.sql` to tighten `public.action_logs` RLS around both `user_id = auth.uid()` and owned `goal_id`, replacing the earlier user-id-only select/insert/update policies with explicit goal-ownership checks and an update `WITH CHECK`. This closes the anon-client RLS gap for the action routes without widening any access.

### Changed (2026-06-19 — Block 0.2: Anon-client RLS hardening)
- Audited `app/api/actions/index+api.ts`, `app/api/actions/[id]+api.ts`, `app/api/goals/activity+api.ts`, and `app/api/goals/complete-measurable+api.ts`. Confirmed Block 0.1 did not change these API auth paths; it only changed signup/callback flow in the auth screens.
- Updated the four audited routes to run their actual Supabase reads/writes through `createAuthedClient(accessToken)` after token validation, so existing table RLS can enforce the caller boundary instead of relying on the shared anon client. Affected files: `app/api/actions/index+api.ts`, `app/api/actions/[id]+api.ts`, `app/api/goals/activity+api.ts`, `app/api/goals/complete-measurable+api.ts`.
- Threaded an optional authed Supabase client through `getActivityByGoalId`, `completeMeasurable`, and `getGoalProgressById` in `lib/db/goals.ts` so the targeted goal routes can keep their current behavior while executing under the caller JWT.

### Changed (2026-06-19 — Block 0.3: Echo auth client consolidation)
- Session `Block 0.3 — Echo auth client consolidation`: audited `app/api/echo/reconcile+api.ts` against `lib/db/client.ts` and existing API route usage, confirming the private `createAuthedClient(accessToken)` matched the canonical export in function name, input, bearer-header handling, auth flags, and env-backed Supabase configuration. Confirmed Block 0.1 only changed signup/callback flow and Block 0.2 only established the same bearer-validated, RLS-scoped route pattern used here.
- Replaced the private authed Supabase client in `app/api/echo/reconcile+api.ts` with the canonical `createAuthedClient` import from `lib/db/client.ts`, removing the duplicate helper and unused `@supabase/supabase-js` import while preserving the route's auth checks, response shape, and database read/write behavior.
- Files touched: `app/api/echo/reconcile+api.ts`, `CHANGELOGCODEX.md`.
- Verification performed: `git diff -- app/api/echo/reconcile+api.ts` confirmed the route diff is limited to the client import/helper removal; `git status --short` confirmed no `supabase/migrations/*` files were created or modified; `npx tsc --noEmit` was blocked by pre-existing syntax errors in `app/about.tsx`; `npx expo export -p web` was blocked by the same pre-existing `app/about.tsx` JSX error plus a missing `./assets/images/favicon.png`.
- No DB migration was required, no migration files were created or modified, and `npx supabase db push` was not run.
- Manual test still required: call `POST /api/echo/reconcile` with a valid bearer token and confirm unauthorized requests still return `401`, successful requests still return `{ reconciled, failed }`, and the same `echo_entries` plus `profiles.last_summarized_at` writes occur.
- Remaining risk: end-to-end runtime verification of the reconcile route is still pending until the unrelated `app/about.tsx` syntax issue and missing web favicon are resolved, or until the route is exercised manually in an authenticated environment.

### Fixed (2026-06-19 — Block 0.2: Anon-client RLS hardening)
- Repo-based RLS audit results: `action_logs`, `goals`, `measurables`, `measurable_logs`, `echo_entries`, `vaults`, `vault_items`, and `echo_goal_links` were reviewed for the four targeted routes. Matching repo policies already existed for all audited goal/activity tables; the missing hardening was on `action_logs`, whose prior policies did not enforce owned `goal_id`.
- Verification performed: route/table audit completed from repo migrations and helper code; `npx tsc --noEmit` passed and `npx expo export -p web` passed. Live Supabase RLS inspection remains pending because the local repo only provides the public Supabase URL and anon key, not a DB connection string or service-role/admin credential for querying live policy metadata safely.
- Manual DB checks still required when Supabase is reachable: apply `supabase/migrations/025_action_logs_rls_hardening.sql`, then verify user A can read/create/update only their own `action_logs`, cannot insert an `action_logs.goal_id` pointing at another user's goal, and that the authed `/api/goals/activity` and `/api/goals/complete-measurable` flows still succeed under RLS.
- Remaining risk: until the new migration is applied to the live Supabase project, the database will continue using the older `action_logs` policies even though the route code is now RLS-compatible.

### Added (2026-04-08 — Conversation 3 Block 4: embedding_text Population + Write-Path Wiring)
- Created `lib/ai/embedding-text.ts`: three pure helper functions with zero side effects — `buildEchoEmbeddingText(content)` returns trimmed content or null if below 40-word floor; `buildGoalEmbeddingText(title, description, milestones)` concatenates title + description + milestone titles, never returns null; `buildVaultItemEmbeddingText(content)` returns trimmed content or null if below floor. All import `EMBEDDING_MIN_WORD_COUNT` from `lib/ai/constants.ts`.
- Created `scripts/backfill-embedding-text.ts`: idempotent backfill for existing `echo_entries`, `goals`, and `vault_items` where `embedding_text IS NULL`. Pure string computation — no API calls. Batches of 100 rows, parallel within batch. Uses Supabase service role client. For goals, joins `measurables(title)` via PostgREST nested select. Reports: "X echo entries, Y goals, Z vault items updated."
- Created `scripts/backfill-embeddings.ts`: idempotent backfill for records where `embedding_text IS NOT NULL AND embedding IS NULL`. Calls Voyage AI via `generateEmbedding()`. Batches of 10 with 200ms delay between batches. Per-record errors are logged and skipped — batch continues. Reports progress every 10 records. Run AFTER `backfill-embedding-text.ts`.

### Changed (2026-04-08 — Conversation 3 Block 4: embedding_text Population + Write-Path Wiring)
- `features/echo/services/echo-service.ts`: added `buildEchoEmbeddingText`, `generateEmbedding`, `EMBEDDING_MODEL` imports; computes `embeddingText` before the `echo_entries` INSERT; adds `embedding_text` field to the INSERT payload; fire-and-forget `.then().catch()` chain after the insert guard writes `embedding` + `embedding_model` using the saved entry's ID. BRT pipeline, echo_goal_links write, and all existing INSERT fields are untouched.
- `lib/db/goals.ts`: added `buildGoalEmbeddingText`, `generateEmbedding`, `EMBEDDING_MODEL` imports; `mapAiGoalDataToDbInserts()` now computes `embeddingText` from `aiData.goal.title`, `aiData.goal.description`, and `aiData.measurables`, adds `embedding_text` to `goalInsert`, and exposes `embeddingText` in the return value; `createGoalWithMeasurables()` destructures `embeddingText` and runs a sync try/catch embedding call AFTER the measurables insert (goal already saved — embedding failure is isolated). Conversation flow untouched.
- `lib/db/vaults.ts`: added `buildVaultItemEmbeddingText`, `generateEmbedding`, `EMBEDDING_MODEL` imports; `createVaultItem()` computes `embeddingText`, adds to INSERT payload, fire-and-forget embedding after insert guard; `addVaultItem()` (legacy) computes `embeddingText`, adds to INSERT payload, adds `.select('id').single()` to return the new row ID, fire-and-forget embedding using that ID. Return type of `addVaultItem()` unchanged (`Promise<void>`).
- Preserved: `lib/ai/embeddings.ts` unmodified. `lib/ai/client.ts` unmodified. No migration files modified. No existing INSERT fields removed.
- `tsc --noEmit`: clean.

### Added (2026-04-08 — Conversation 3 Block 3: Postgres Match Functions + Retrieval Layer)
- Created `supabase/migrations/024_embedding_match_functions.sql`: three Postgres match functions (`match_echo_entries`, `match_goals`, `match_vault_items`) for semantic vector retrieval. All use `LANGUAGE sql STABLE`, `SECURITY INVOKER` (RLS enforced), and `SET search_path = public, extensions` so pgvector `<=>` operator resolves correctly from the extensions schema. Returns similarity as `1 - (embedding <=> query_embedding)` (cosine). `match_echo_entries` uses `content` column (canonical name after migration 005 rename chain). `match_goals` includes `description` column (confirmed present since migration 003). `match_vault_items` uses `created_by` for ownership (confirmed from migration 017). All functions filter `WHERE embedding IS NOT NULL`.
- Created `lib/db/embeddings.ts`: application-layer retrieval module with three functions — `findSimilarEchoEntries`, `findSimilarGoals`, `findSimilarVaultItems`. Each calls `generateEmbedding(text, 'query')` from `lib/ai/embeddings.ts`, returns empty array on null (text too short), calls the corresponding Postgres function via `supabase.rpc()`, maps snake_case DB rows to camelCase result types via local `DbXxxMatchRow` types and explicit mapper functions following the existing `lib/db/` pattern. Exported result types: `EchoMatchResult`, `GoalMatchResult`, `VaultItemMatchResult`. RPC errors throw with function name and Supabase error message — callers decide retry/fallback. No `any` used; `unknown` cast to typed rows.

### Added (2026-04-08 — Conversation 3 Block 2: Voyage Embedding Pipeline)
- Created `lib/ai/embeddings.ts` as a standalone Voyage REST embedding client with `generateEmbedding()` and `generateEmbeddings()`; applies the 40-word floor and 512-token approximate truncation from `lib/ai/constants.ts`, skips short inputs by returning `null`, validates 1024-dimension numeric vectors, retries once on 5xx/network failures, and emits structured JSON observability logs without routing through `callLLM` or consuming daily AI quota.
- Exported `EmbeddingResult` from `lib/ai/embeddings.ts` for future retrieval/write-path callers; includes `embedding`, `model`, `inputType`, `dimensions`, and `latencyMs`.

### Changed (2026-04-08 — Conversation 3 Block 2: Voyage Embedding Pipeline)
- Updated `lib/ai/errors.ts` with embedding-specific constants and typed errors: `EMBEDDING_FAILED`, `EMBEDDING_RATE_LIMITED`, and `EMBEDDING_KEY_MISSING`, so Voyage failures follow the existing AI error pattern instead of surfacing raw fetch/provider exceptions.
- Updated `lib/ai/contracts.ts` to extend `AiErrorCode` with the new embedding error codes required by `lib/ai/errors.ts` and `lib/ai/embeddings.ts`.
- Preserved existing Anthropic pipeline files: `lib/ai/client.ts` and `lib/ai/echo-client.ts` were left unchanged, and no dependencies were added to `package.json`.

### Added (2026-04-08 — Conversation 3 Block 1: pgvector Setup)
- Created `supabase/migrations/023_pgvector_setup.sql`: enables `vector` extension via `CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions`; adds `embedding vector(1024)`, `embedding_text text`, and `embedding_model text` columns (all nullable, `IF NOT EXISTS`) to `echo_entries`, `goals`, and `vault_items`; creates HNSW indexes (`vector_cosine_ops`, m=16, ef_construction=64) on all three tables; adds partial index `idx_vault_items_needs_embedding` filtering for unembedded items with `content` length > 200 chars. Migration is fully idempotent. Model: `voyage-4-lite`, 1024 dimensions. Spec ref: `ohara_constellation_spec.md` Section 7c.
- Added `embedding?: number[] | null`, `embedding_text?: string | null`, `embedding_model?: string | null` to `EchoEntry` in `features/echo/types.ts` — append-only, no existing fields modified.
- Added same three fields to `Goal` in `features/goals/types.ts` — append-only.
- Added same three fields to `VaultItem` in `types/vault.ts` — append-only.
- Created `lib/ai/constants.ts`: `EMBEDDING_DIMENSIONS = 1024`, `EMBEDDING_MODEL = 'voyage-4-lite'`, `EMBEDDING_MIN_WORD_COUNT = 40`, `EMBEDDING_MAX_TOKENS = 512`.
- `tsc --noEmit`: clean.

### Cleanup (2026-04-08 — Second Cleanup Pass)
Passes: H1, H3, H6 (H5 flagged — see below). Batch D items confirmed complete from prior session.

- **H1:** Deleted `store/vaults.ts` and `store/echo-links.ts`. Both confirmed zero live imports. Canonical data access remains via hook layer (`useVault.ts`, `useEchoTrail.ts`).
- **H3:** Removed `mode: 'commitment' as const` from the goal insert block in `lib/db/goals.ts` (~line 68). DB column preserved; application no longer writes to it. **[CLOSED 2026-06-22]** — this removal caused a NOT-NULL insert failure in production; the write was restored and the column's CHECK constraint tightened. See "Added (2026-06-22 — Block 1: API-layer goal creation + mode fix)" above.
- **H6:** Renamed `ActionLog` fields to camelCase in `features/actions/types.ts` (`goal_id → goalId`, `user_id → userId`, `action_text → actionText`, `due_date → dueDate`, `completed_at → completedAt`, `created_at → createdAt`). Added explicit `mapActionLog()` DB→TS mapping functions in both `app/api/actions/index+api.ts` and `app/api/actions/[id]+api.ts` so DB snake_case rows are properly converted before serialization. Updated `displayedAction.action_text → displayedAction.actionText` in `features/actions/components/NextActionSection.tsx` and `app/(app)/dashboard.tsx`. DB column names in Supabase queries unchanged.
- **H5:** Created `features/projects/types.ts` with `ProjectStatus`, `Project`, and `ProjectWithGoals` (moved verbatim from `features/goals/types.ts`; `ProjectWithGoals` imports `GoalWithMeasurables` from `@/features/goals/types`). Removed all three types from `features/goals/types.ts`. Updated four import paths: `features/projects/store.ts`, `features/projects/services/project-service.ts`, `features/projects/components/ProjectCard.tsx`, `app/projects/[id].tsx`. `GoalWithMeasurables` import in project-service.ts preserved from `@/features/goals/types`. H5 completed: Project and ProjectWithGoals moved to features/projects/types.ts. Four import paths updated. tsc clean.
- **Batch D (confirmed complete):** All D2–D6 items were applied in the prior session. Verified: `vaultIdToGoalId` rename in goal-service.ts, Bud color #4A7C5F in both CLAUDE.md files, `if (error) return null` in ActivityFeed.tsx, `onClose` wired to `closeSheet` in vault.tsx, pipeline removal note in lib/ai/CLAUDE.md.

Deferred: H2 (echo prompt consolidation), H4 (useEchoTrail API boundary) — each has its own dedicated session.

`tsc --noEmit`: clean after H1, H3, H6.

### Cleanup (2026-04-07 — Codebase Audit)
Batches: A, B (partial), C (partial), D (partial)

- **Batch A:** Deleted 22 dead files: `lib/ai/queue.ts`, `lib/ai/pipelines/create-goal.ts`, `lib/ai/pipelines/reflect.ts`, `lib/ai/pipelines/summarize.ts`, `lib/rules/{task-recommender,hobby-matcher,thorn-detector}.ts`, `lib/utils/{date,validation,ui-store}.ts`, `lib/activity/mappers.ts`, `features/dashboard/components/DailyView.tsx`, `features/dashboard/hooks/useDailyTasks.ts`, `features/dashboard/services/task-recommender.ts`, `features/dashboard/types.ts`, `features/goals/components/{GoalMediaGallery,GoalEchoEntriesPanel,NewGoalButton}.tsx`, `features/goals/hooks/useMeasurables.ts`, `features/goals/services/mock-data.ts`, `features/echo/services/mock-data.ts`, `features/profile/services/profile-service.ts`. Removed `ECHO_REFLECTION_PROMPT` dead export from `lib/ai/echo/prompts.ts`. Removed `createGoal()` TODO stub from `features/goals/services/goal-service.ts`. Removed stale `TRACKED DEBT — vaultNoteCount → vaultItemCount` entry from `CONTEXT.md` (completed in Prompt 11).
- **Batch B:** Deleted `types/global.ts` and `types/index.ts` after moving live `Profile` type to `features/auth/types.ts` and updating `features/auth/store.ts` import. Removed dead `ActivityEntry` interface from `features/goals/types.ts`. Converted three inline `ActivityItem` union variants (`vault_item_added`, `insight_confirmed`, `echo_linked`) to named interfaces (`VaultItemAddedActivity`, `InsightConfirmedActivity`, `EchoLinkedActivity`). Updated `ActivityKind` union to include all six variants.
- **Batch C (C3 only):** Added refactor-target comment above `getActivityByGoalId()` in `lib/db/goals.ts` documenting that activity assembly logic belongs in the service layer (Phase 2 target).
- **Batch D (partial):** Renamed `vaultGoalMap` → `vaultIdToGoalId` in `features/goals/services/goal-service.ts`. Updated Bud BRT color from `#22C55E` → `#4A7C5F` in `components/CLAUDE.md` and `lib/db/CLAUDE.md`. Removed `void error` suppression in `ActivityFeed.tsx` (replaced with `if (error) return null`). Removed `void onClose` suppression in `vault.tsx` `VaultPickerSheet` (wired to Cancel button). Documented pipeline removal in `lib/ai/CLAUDE.md`.

Excluded: H1–H6 items pending human review (store pattern decision, echo prompt consolidation, mode column, useEchoTrail boundary, Project type move, ActionLog rename).

`tsc --noEmit`: clean after each batch.

### Added (2026-04-07 — Prompt 11: Constellation Sample SVG)
- Added `components/constellation/ConstellationSample.web.tsx` as a static inline SVG constellation sample using the existing React Native Web raw-`<svg>` pattern, with seven labeled nodes, curved connection paths, and a reduced-motion-safe pulse on the Current Season anchor. Added `components/constellation/ConstellationSample.tsx` as a native-safe static fallback so no new SVG dependency was required.

### Changed (2026-04-07)
- Updated `app/(app)/constellation.tsx` to replace the prior star-dot placeholder visual with the new Constellation sample inside a white preview card, while leaving the existing screen structure and summary-gate logic intact.
- Polished `app/projects/[id].tsx` by replacing the stubbed edit row with a local modal form wired to `updateProject()`, updating hero state immediately after save, and consolidating delete confirmation onto a minimally extended shared `components/ui/Modal.tsx` with optional confirm/cancel actions and destructive styling.
- Fixed project detail goal loading in `features/projects/services/project-service.ts` by adding a project-scoped goals query and removing the previous fetch-all-then-filter behavior, while preserving the same mapped goal shape and signal enrichment used by `GoalCard`.
- Extended `app/projects/[id].tsx` below the existing Goals section only: added placeholder `Project Vault` and `Activity` cards, added a `Settings` card with stubbed edit action, space-gated hidden manage-members placeholder, and a local destructive delete confirmation modal wired to the existing `deleteProject()` project service helper. Hero card and Goals section from Prompt 10A were left unchanged.
- Redesigned the top two sections of `app/projects/[id].tsx`: rebuilt the project hero card with shared badge styling, aggregate child-goal progress, and the requested cream/white/forest hierarchy; rebuilt the Goals section as a vertical shared-`GoalCard` list with count badge, filled `+ Add Goal` CTA, and the new empty-state copy. Left lower page sections unchanged. No project model or goal-card variant changes.
- Renamed goal signal field `vaultNoteCount` to `vaultItemCount` in the goal type, goal service, goal card, and goal mock data; updated the GoalCard label from notes to items with no logic changes.

### Added (2026-04-07 — Prompt 9C: Signal Refinement + BRT Centralization)
- Extracted inline BRT derivation logic from `fetchGoalSignals()` into a named helper `deriveBrtTag(brt: DbBrtValue): 'bud' | 'rose' | 'thorn' | null` in `features/goals/services/goal-service.ts`. Annotated with heuristic comment and Phase 2 migration note. No behavior change.
- Fixed GoalCard layout shift: wrapped conditional activity line (`{n} notes · {n} reflections`) in a fixed `minHeight: 20` View so card height is stable whether signals are present or not.
- Confirmed Constellation screen uses API route (`/api/dashboard/summary`) for counts — `supabase` import is auth-token-only (no direct data reads). No logic changes.
- Renamed `{/* Progress section */}` comment to `{/* Progress gates */}` for clarity.
- `tsc --noEmit`: clean.
- Updated `CONTEXT.md`: added Signal Layer Notes section documenting `deriveBrtTag()` location and `vaultNoteCount → vaultItemCount` rename as tracked Phase 1.5 debt.

### ✓ Prompt 9 Complete (9A + 9B + 9C)
- 9A: Echo → Goal auto-linking (keyword heuristic, `echo_goal_links`, non-blocking IIFE)
- 9B: Goal signal enrichment (vaultNoteCount, echoLinkCount, latestBrtTags), GoalCard micro-dots, Constellation screen, dashboard summary API
- 9C: BRT helper centralization, GoalCard layout-shift fix, signal layer documentation

### Added (2026-04-07 — Prompt 9B: Goal Signal Enrichment + Constellation Screen)
- Extended `GoalWithMeasurables` in `features/goals/types.ts` with three signal fields: `vaultNoteCount: number`, `echoLinkCount: number`, `latestBrtTags: string[] | null`.
- Added `fetchGoalSignals()` helper in `features/goals/services/goal-service.ts` that fetches per-goal vault note counts, echo link counts, and latest BRT tags in 4 bulk queries (no N+1). BRT tag derived from `echo_entries.brt` JSONB object (bud → rose → thorn priority). Signal fetch failures are caught and silently ignored so goal list is never blocked.
- Updated `fetchGoals()` in `goal-service.ts` to call `fetchGoalSignals()` and merge results into returned goals. `mapGoal()` now sets default `vaultNoteCount: 0`, `echoLinkCount: 0`, `latestBrtTags: null` so all callers remain valid.
- Updated `features/goals/services/mock-data.ts` to include signal default fields on all 5 mock goals.
- Updated `features/goals/components/GoalCard.tsx`: added activity line below progress bar (`{n} notes · {n} reflections`, only when count > 0); added BRT micro-dots (6×6 circles, flex row, `alignSelf: flex-end`) in footer using color map: bud `#4A7C5F`, rose `#F59E0B`, thorn `#EF4444`. No other GoalCard logic or styles changed.
- Created `app/api/dashboard/summary+api.ts`: authenticated GET route returning `{ goalCount, echoCount }` using Supabase `count: 'exact'` — used by Constellation screen.
- Replaced `app/(app)/constellation.tsx` placeholder with full Phase 1.5 implementation: SafeAreaView + ScrollView, star-node visual (8 positioned Views, no SVG dep), headline, subtext, progress bars toward 3-goal / 10-echo gates, status line. Fetches from `/api/dashboard/summary` via Bearer token. Counts rendered only after loaded (null guard). No direct Supabase data calls.
- Replaced `app/(app)/explore.tsx` content with centered placeholder ("Explore is coming") using inline styles, no icon library, SafeAreaView container.
- Added `CONSTELLATION_ENABLED: false` to `constants/features.ts`.
- Updated `components/layout/Sidebar.tsx` NAV_ITEMS: added Constellation route (gated by `CONSTELLATION_ENABLED`, opacity 0.4, no-nav when disabled).
- Updated `app/(app)/_layout.tsx`: added `constellation` Stack.Screen for sidebar path; added Constellation Tabs.Screen (hidden via `href: null` when `CONSTELLATION_ENABLED` is false); updated `tabBarActiveTintColor` to `#3D5247`.
- `tsc --noEmit`: clean.

### Added (2026-04-07 — Echo → Goal Auto-Linking)
- Updated `features/echo/services/echo-service.ts:createEntry()` to write to `echo_goal_links` after every successful `echo_entries` insert. Manual link fires when `goalId` is provided (`link_source: 'manual'`, `confirmed: true`). AI auto-link fires when no `goalId` is provided — keyword heuristic scores active goal titles against entry content, inserts the single best match above 0.7 threshold (`link_source: 'ai_auto'`, `confirmed: false`). Both paths are non-blocking void IIFEs isolated from the main save flow. Bridge table upsert uses `onConflict: 'echo_entry_id,goal_id'` with `ignoreDuplicates: true` — no duplicate links possible. No new AI calls introduced; Phase 2 classifier can swap in by replacing the auto-link IIFE body. `tsc --noEmit` clean.

### Added (2026-04-07 — Echo Links Zustand Store)
- Added `store/echo-links.ts` with a new `useEchoLinksStore` Zustand store that mirrors `store/vaults.ts`, using the existing goal-fetch helper plus authenticated echo-link confirm, dismiss, and manual-create mutations with exact optimistic rollback paths and recomputed unconfirmed counts.
- Added `EchoEntryWithLink` to `types/echo-link.ts` so the new echo-links store can type its linked-entry state against the existing `getEchoEntriesForGoal()` response shape.
- Added `GET /api/echo-links/:goalId` handling in `app/api/echo-links/[linkId]+api.ts` so goal-linked echo entries can be loaded through the API using the repo’s existing Bearer-token auth pattern and response conventions.

### Changed (2026-04-07 — Echo Links API Fetch)
- Updated `store/echo-links.ts` to load goal-linked echo entries from `/api/echo-links/:goalId` instead of importing `lib/db/echo-goal-links` directly, preserving the existing store logic while moving the read path behind the API boundary.

### Added (2026-04-07 — Vault Zustand Store)
- Added `store/vaults.ts` with a new `useVaultStore` Zustand store for goal-detail vault state, following the existing store architecture while adding authenticated vault fetch/create/update/delete actions plus precise optimistic rollback paths for confirm and dismiss flows.
- Added `CreateVaultItemInput` to `types/vault.ts` so the new vault store can accept a typed create payload that matches the current `POST /api/vaults/[goalId]` request contract.

### Added (2026-04-06 — Goal Vault + Echo Trail)
- Added `features/goals/hooks/useVault.ts`, `features/goals/hooks/useEchoTrail.ts`, `features/goals/components/VaultItemCard.tsx`, and `features/goals/components/EchoTrail.tsx` so the goal vault screen can manage saved notes/links and review linked Echo reflections in dedicated reusable UI/hooks.

### Changed (2026-04-06 — Goal Detail + Vault Surface)
- Updated `app/goals/[id]/index.tsx` to show parent project context plus summary cards for Vault and Reflections, making the goal detail screen a clearer hub into the new vault and journaling flows.
- Updated `app/goals/[id]/vault.tsx`, `features/goals/components/ActivityFeed.tsx`, `lib/db/goals.ts`, and `docs/DECISIONS.md` to reshape Vault into a richer note/link/reflection workspace and surface vault additions, confirmed insights, and linked reflections in the activity timeline.

### Changed (2026-04-06 — Prompt 5 Surgical Fix)
- Updated `lib/db/client.ts` to export `createAuthedClient(accessToken)`, mirroring the existing bearer-token-scoped Supabase pattern so Prompt 5 API routes can execute RLS-gated reads/writes under the authenticated user instead of the shared anon client.
- Updated `lib/db/vaults.ts` service signatures to accept an optional Supabase client and added ownership helpers `getVaultByGoalIdForUser` and `getVaultItemByIdForUser` so vault API routes can keep ownership checks inside the service layer while preserving existing external behavior for other callers.
- Updated `lib/db/echo-goal-links.ts` service signatures to accept an optional Supabase client, added `getUnconfirmedLinksForUserGoals`, `getEchoLinkByIdForUserGoal`, and `createLinkForUserGoal`, and kept `getUnconfirmedLinksForUser` as a compatibility alias. Ownership is now consistently scoped through `goals.user_id` across the Prompt 5 echo-link routes.
- Updated `app/api/vaults/[goalId]+api.ts`, `app/api/vaults/items/[itemId]+api.ts`, `app/api/echo-links/+api.ts`, and `app/api/echo-links/[linkId]+api.ts` to use the canonical bearer-auth extraction shape (`{ userId, accessToken }`), create token-scoped DB clients for their service calls, and apply the canonical string sanitization pattern to route params and request IDs.

### Fixed (2026-04-06 — Prompt 5 Surgical Fix)
- Fixed Prompt 5 vault and echo-link API routes so their DB operations now run under authenticated bearer context, making the routes merge-safe with existing RLS instead of relying on the shared anon client. Affected files: `lib/db/client.ts`, `lib/db/vaults.ts`, `lib/db/echo-goal-links.ts`, `app/api/vaults/[goalId]+api.ts`, `app/api/vaults/items/[itemId]+api.ts`, `app/api/echo-links/+api.ts`, `app/api/echo-links/[linkId]+api.ts`.
- Replaced fragile duplicate echo-link detection in `app/api/echo-links/+api.ts` by preserving structured Supabase/Postgres error metadata from `lib/db/echo-goal-links.ts` and mapping unique violations (`23505`, optional echo-link constraint match) to HTTP 409.

### Added (2026-04-06 — Migration 022)
- Created `supabase/migrations/022_spaces_rename_owner_id.sql`: renames `spaces.user_id` → `spaces.owner_id`. Includes: column rename; drop/recreate `spaces_user_id_idx` → `spaces_owner_id_idx`; drop/recreate `spaces_one_personal_per_user_idx` on `owner_id`; drop/recreate 4 RLS policies on `public.spaces`; drop/recreate 4 RLS policies on `public.space_members` that subquery `spaces.owner_id`; updated `handle_new_user_space()` function INSERT/ON CONFLICT/SELECT to use `owner_id`.

### Changed (2026-04-06 — Migration 022)
- Updated `lib/db/spaces.ts`: `DbSpaceRow.user_id` → `owner_id`; `mapSpace(row.user_id)` → `mapSpace(row.owner_id)`; all `.select()` strings and `.eq('user_id', ...)` against spaces table updated to `owner_id`; insert payload key `user_id` → `owner_id`. `space_members` queries unchanged (their `user_id` column is unaffected).

### Added (2026-04-06 — Prompt 4)
- Created `lib/db/spaces.ts`: `getPersonalSpace`, `getSpacesForUser`, `createSpace`, `getSpaceMembers`, `addSpaceMember`, `removeSpaceMember`. Uses types from `types/space.ts`. Maps DB `owner_id` → `Space.ownerId`; `joined_at` → `joinedAt`. `getSpacesForUser` uses two sequential queries (space_members then spaces IN) to match existing no-complex-join pattern.
- Created `lib/db/echo-goal-links.ts`: `getLinksForEchoEntry`, `getLinksForGoal`, `getEchoEntriesForGoal`, `createLink`, `confirmLink`, `dismissLink`, `getUnconfirmedLinksForUser`. Uses types from `types/echo-link.ts` and `EchoEntry` from `features/echo/types.ts`. `getEchoEntriesForGoal` and `getUnconfirmedLinksForUser` use two sequential queries instead of complex JOINs. Maps `echo_entry_id` → `echoEntryId`, `link_source` → `linkSource`.
- Rewrote `lib/db/vaults.ts` with canonical service API: `getVaultByGoalId`, `getVaultItems` (sort_order ASC), `getVaultItemsByType`, `createVaultItem`, `updateVaultItem`, `deleteVaultItem`, `getVaultWithItems`. All functions use types from `types/vault.ts`; re-exports `VaultItem` from that module. Legacy helpers (`getOrCreateVault`, `addVaultItem`, `getVaultItemCount`) preserved unchanged.

### Changed (2026-04-06 — Prompt 4)
- Updated `app/goals/[id]/vault.tsx`: changed `item.created_at` → `item.createdAt` (strictly necessary — `VaultItem` is now the canonical camelCase type from `types/vault.ts`).

### Added
- Documented `POST /api/goals/create` AI goal creation endpoint in `docs/API_CONTRACT.md`, including full `GoalFinalizeResponse` payload shape (`goal`, `measurables`, `reasoning`, `assumptions`). Affected file: `docs/API_CONTRACT.md`.
- Added `supabase/migrations/012_goals_visibility_model.sql` to replace `goals.is_public` with checked `visibility` values (`private`, `circle`, `public`), backfill existing rows safely, and remove the legacy boolean/index path.
- Added `supabase/migrations/013_daily_ai_usage_rate_limit.sql` with `daily_ai_usage`, authenticated quota consumption via `consume_daily_ai_quota`, and a 30-requests-per-day limit for AI calls.

### Changed
- Added goal-level vault entry counts to the goal detail milestone rows by introducing `getVaultItemCount` in `lib/db/vaults.ts`, fetching it from `app/goals/[id]/index.tsx` on focus, and threading the shared count through `features/goals/components/MeasurablesPanel.tsx` and `features/goals/components/MeasurableCard.tsx` so each milestone shows the current `X entries` text without changing layout structure.
- Removed the placeholder `Activity` card from `app/projects/[id].tsx` after auditing goal/project detail screens, leaving the real goal detail activity feed intact and avoiding fabricated project update copy.
- Changed the `goal_created` activity fallback timestamp in `lib/db/goals.ts` from the Unix epoch to the current time so missing `created_at` values no longer render a 1969/1970 date in the activity feed.
- Moved the goal-level vault entry count display from each milestone row into `features/goals/components/MeasurablesPanel.tsx`, removing the per-row subtitle in `features/goals/components/MeasurableCard.tsx` and rendering a single subdued `X vault entries` line above the milestone list instead.
- Tightened prompt verbosity across `lib/ai/prompts/echo-reflection.ts`, `lib/ai/prompts/intelligence.ts`, `lib/ai/prompts/goal-creation.ts`, `lib/ai/prompts/summarizer.ts`, and `lib/ai/prompts/reflect.ts` to reduce extra wording while preserving downstream prompt contracts and sys tem signals.
- Constrained conversational prompts to shorter, more direct responses where the prompt format allows it, including explicit 2-3 sentence guidance for `lib/ai/prompts/echo-reflection.ts`, `lib/ai/prompts/intelligence.ts`, and Stage 1 of `lib/ai/prompts/goal-creation.ts`.
- Preserved structured prompts with minimal explanation requirements and no extra commentary outside required JSON structure in `lib/ai/prompts/goal-creation.ts` and `lib/ai/prompts/summarizer.ts`, while tightening explanatory response guidance in `lib/ai/prompts/reflect.ts`.
- Updated goal schema/types, service mapping, mock data, and goal card sharing badges to use explicit `visibility` literals instead of `is_public` / `isPublic`. Affected files: `lib/goals/schema.ts`, `types/global.ts`, `features/goals/types.ts`, `features/goals/services/goal-service.ts`, `features/goals/services/mock-data.ts`, `features/goals/components/GoalCard.tsx`, `lib/db/goals.ts`.
- Updated goal-sharing policy/docs references to the new visibility model, keeping Phase 1 access conservative so `circle` is not treated as public before connection-aware rules exist. Affected files: `supabase/migrations/003_goals_measurables_schema.sql`, `docs/API_CONTRACT.md`, `docs/ARCHITECTURE.md`, `Context.md`, `docs/DECISIONS.md`.
- Added daily AI rate limiting at the `lib/ai/client.ts` chokepoint, routing Echo through the same path, requiring authenticated user context for tracked AI calls, and returning structured `RATE_LIMITED` / HTTP 429 responses instead of generic failures. Affected files: `lib/ai/client.ts`, `lib/ai/echo-client.ts`, `lib/ai/errors.ts`, `app/api/goals/create+api.ts`, `app/api/echo/reflect+api.ts`, `app/api/intelligence/index+api.ts`, `lib/ai/pipelines/*.ts`.
- Updated goal creation, Echo, and intelligence frontend handling for AI 429 responses so rate-limited requests do not retry infinitely, Echo keeps the saved reflection path intact, and the UI surfaces the new limit state. Affected files: `app/goals/create.tsx`, `features/echo/services/echo-service.ts`, `features/echo/components/EchoScreen.tsx`, `app/(app)/dashboard.tsx`.
- Added a persisted Echo composer draft store in `features/echo/draft-store.ts` and updated `features/echo/components/EchoScreen.tsx`, `features/echo/hooks/useEntries.ts`, and `features/echo/services/echo-service.ts` so Echo drafts restore per context (`global` or `goal:<goal_id>`), save locally after 500ms of inactivity, clear only after confirmed submission, and show inline submission-state messaging for saved-without-summary, offline, and unconfirmed-submit outcomes. Assumption: the existing Echo flow confirms persistence once the `echo_entries` insert succeeds, while `/api/echo/reflect` semantics only determine whether the AI response is immediately available.
- Added explicit `Inter` font usage to previously implicit dashboard, goals, goal-detail, and activity text styles, and updated `components/ui/Typography.tsx` so the shared `title` variant resolves through the Inter-backed `font-sans` mapping. Affected files: `app/(app)/dashboard.tsx`, `app/goals/index.tsx`, `app/goals/[id].tsx`, `features/goals/components/GoalDetailHeader.tsx`, `features/goals/components/ActivityFeed.tsx`, `components/ui/Typography.tsx`.
- Rewrote `features/projects/components/ProjectCard.tsx` to replace the GoalCard-like shell with a project-specific layout using a status dot, `Last active` metadata from `updated_at`, an optional two-line description, and a neutral placeholder progress rail so Phase 1 project cards reflect available data without inventing progress values.
- Updated `features/echo/components/EchoScreen.tsx`, `features/echo/hooks/useEntries.ts`, and `features/echo/services/echo-service.ts` so Echo entries can capture optional BRT and emotion metadata from new composer pill selectors, persist both fields to `echo_entries`, and render the refreshed cream-themed list cards with relative timestamps and emotion badges.
- Updated Echo and goal-facing schema types, mock data, service mapping, and AI prompt templates to replace legacy `classification` / `is_public` references with `brt`, `emotion`, `model_version`, and `visibility` for the new `echo_entries` schema. Affected files: `features/echo/types.ts`, `features/echo/services/echo-service.ts`, `features/echo/services/mock-data.ts`, `features/goals/types.ts`, `features/goals/services/mock-data.ts`, `lib/ai/prompts/reflect.ts`, `lib/ai/prompts/summarizer.ts`, `types/global.ts`.
- Added `supabase/migrations/009_echo_entries_schema_update.sql` to update `public.echo_entries` by dropping legacy `classification` / `is_public` fields and adding `brt`, `emotion`, `model_version`, and checked `visibility` metadata for the current Echo schema.
- Renamed the reflection and journaling feature to Echo across routes, feature modules, AI helpers, flags, docs, migrations, and generated artifacts so the codebase now consistently uses `Echo` / `echo` / `ECHO`. Affected files include `app/(app)/echo.tsx`, `app/api/echo/reflect+api.ts`, `features/echo/**`, `features/goals/components/GoalEchoEntriesPanel.tsx`, `constants/features.ts`, `lib/ai/echo-client.ts`, `lib/ai/prompts/echo-reflection.ts`, and the related docs/migrations/dist files.
- Updated goal `status` enum throughout `docs/API_CONTRACT.md` — replaced `paused / completed / archived` with canonical DB values `complete / stagnant / discovered` (matches `GOAL_DB_STATUSES` in `lib/goals/schema.ts`). Affected file: `docs/API_CONTRACT.md`.
- Added `smartData` as a required field in `GET /api/v1/goals` list response and `GET /api/v1/goals/:id` hydrated response in `docs/API_CONTRACT.md`.
- Renamed Echo fields in all request/response shapes in `docs/API_CONTRACT.md`: `rawText → content`, `aiOptedIn → aiInsightRequested` (aligns with migration 005 column renames). Affected file: `docs/API_CONTRACT.md`.
- Clarified `assumptions` is always `string[]`, never `null` or `undefined`; empty array when no assumptions were made. Affected file: `docs/API_CONTRACT.md`.
- Bumped contract version to 1.1 and updated `Last updated` date in `docs/API_CONTRACT.md`.
- Updated draft-stage goal-creation guidance in `lib/ai/prompts/goal-creation.ts` to use a stable user-facing structure with `Draft title`, `Summary`, `Why this matters`, `Assumed timeline`, `First milestones`, `Assumptions`, and up to 1-3 targeted questions.
- Clarified in `lib/ai/prompts/goal-creation.ts` that completing the draft structure should not force finalization.
- Consolidated goal schema constants and field types in `lib/goals/schema.ts`, and updated prompt/runtime/frontend imports to use the shared canonical goal categories, measurable enums, smart fields, and DB status values.
- Normalized finalized goal payload handling so `GoalFinalizeResponse` is the single canonical draft-to-save shape across `app/api/goals/create+api.ts`, `app/goals/create.tsx`, and `lib/db/goals.ts`.
- Added goal deletion support across `features/goals/services/goal-service.ts`, `features/goals/store.ts`, and `features/goals/components/GoalCard.tsx` so the existing `⋯` affordance now opens a delete flow with React Native `Alert` confirmation and removes deleted goals from Zustand state.
- Updated `app/(app)/dashboard.tsx` so Projects always remain accessible from the dashboard via the header `+` action, and replaced the fully empty dashboard state with a single guided chooser for creating either a goal or a long-term project.
- Added optional project linking during goal creation in `app/goals/create.tsx`, threading `projectId` through `app/api/goals/create+api.ts` and the existing persistence helper in `lib/db/goals.ts` so a goal can be pre-linked from a project or manually attached before the conversation starts.
- Fixed the `GoalCard` overflow interaction in `features/goals/components/GoalCard.tsx` by replacing the nested alert-only trigger with local menu state, a dismiss backdrop, and a web-safe responder wrapper so tapping `⋯` reliably opens the delete menu on React Native Web.
- Updated `features/goals/components/GoalCard.tsx` to use a web-compatible delete confirmation path (`window.confirm` on web, `Alert.alert` on native) so selecting `Delete goal` now confirms and proceeds reliably on React Native Web.

### Refactored
- Aligned structured draft detection in `evals/goal-creation/run.mjs` with the new draft-stage headings so local evals recognize the updated prompt shape.
- Updated `evals/goal-creation/scoring-rubric.md` to document the new draft-stage draft signals used by the goal-creation eval harness.
- Removed duplicate and dead goal payload validation/types from `app/api/goals/create+api.ts`, normalized `assumptions` to `string[]` in `lib/ai/schemas/goal-creation.ts`, and tightened frontend hydration in `features/goals/services/goal-service.ts` to normalize DB numerics/dates/statuses instead of relying on unsafe casts.
- Aligned frontend goal/measurable models and mock data with the persisted schema in `features/goals/types.ts`, `features/goals/services/mock-data.ts`, and `features/goals/components/GoalDetailHeader.tsx`, including support for hydrated `smartData`.

# CHANGELOGCODEX.md

## [Unreleased]

### Added
- Added a dedicated Echo reflection prompt in `lib/ai/prompts/echo-reflection.ts` and a separate Haiku-backed Echo client in `lib/ai/echo-client.ts` so Echo reflections now use an isolated AI path instead of the goal-creation client.

### Changed
- Added a gated affiliate teaser placeholder to `app/goals/[id].tsx` using the existing `useActivity` items array, and created `components/AffiliateTeaser.tsx` for the new cream-toned informational card that only appears after progress exists and at least one `echo_entry` activity is present.
- Refined the new affiliate teaser placeholder styling in `components/AffiliateTeaser.tsx` and wired its goal-detail placement directly below `ActivityFeed` in `app/goals/[id].tsx` so the Phase 1 card stays informational, non-interactive, and conditionally visible from existing activity state.
- Added `getEntriesByGoalId(goalId)` to `features/echo/services/echo-service.ts` and surfaced linked Echo entry previews on the goal detail screen via `features/goals/hooks/useGoalDetail.ts`, `app/goals/[id].tsx`, and `features/goals/components/GoalEchoEntriesPanel.tsx` so goals now show their related reflections directly below measurables.
- Replaced hardcoded fallback Supabase client credentials in `lib/db/client.ts` with required environment validation so the app no longer initializes against placeholder values when `EXPO_PUBLIC_SUPABASE_URL` or `EXPO_PUBLIC_SUPABASE_ANON_KEY` are missing.
- Set `ECHO_ENABLED` to `true` in `constants/features.ts` for Phase 1 shipping, while keeping `DISCOVERY_ENABLED` `false`, and wired `app/(app)/_layout.tsx` so the Echo and Explore tabs now render only when their respective flags are enabled.
- Wired Echo entry creation through a new `app/api/echo/reflect+api.ts` backend path and updated `features/echo/services/echo-service.ts` to request and persist a concise Echo reflection only when `aiInsightRequested` is true, with `processed_at` set after a successful response.
- Replaced the dashboard, goal detail, and Echo bare loading text with dark-theme NativeWind pulse skeletons, and updated the relevant CTAs to match the Phase 1 teal accent. Affected files: `app/(app)/dashboard.tsx`, `app/goals/[id].tsx`, `features/echo/components/EchoScreen.tsx`, `features/goals/components/NewGoalButton.tsx`, `components/ui/EmptyStateCard.tsx`.

### Fixed
- Added a subtle empty state for goal-linked Echo content on the detail screen: `No Echo entries yet.` This keeps the section informative when a goal has no related entries.
- Added `supabase/migrations/006_rls_audit_fixes.sql` to make RLS CRUD coverage explicit for `measurables`, `measurable_logs`, `profiles`, and `ai_usage`, closing gaps where policies relied on `FOR ALL` without `WITH CHECK` or omitted explicit deny coverage for blocked operations.
- Added `supabase/migrations/007_remove_public_goals_policy.sql` to remove the Phase 2 public-goals select policy from `public.goals` without changing any other goals RLS policies.
- Standardized empty-state treatment across Dashboard, Echo, goal-linked Echo entries, and goal measurables so Phase 1 users see centered dark cards with clear next steps instead of bare copy. Affected files: `app/(app)/dashboard.tsx`, `features/echo/components/EchoScreen.tsx`, `features/goals/components/GoalEchoEntriesPanel.tsx`, `features/goals/components/MeasurablesPanel.tsx`, `components/ui/EmptyStateCard.tsx`.
- Tightened Echo summarization success semantics in `app/api/echo/reflect+api.ts` so `summarized` now returns `true` only when the AI response parses into a valid reflection payload; malformed fallback responses keep `summarized: false`, which preserves the existing DB update gate in `features/echo/services/echo-service.ts` and leaves failed summary attempts unsummarized.
- Tightened Echo submission-state branching across `features/echo/services/echo-service.ts`, `features/echo/hooks/useEntries.ts`, and `features/echo/components/EchoScreen.tsx` so pre-persistence network failures resolve to `offline`, unknown pre-persistence failures resolve to `unconfirmed`, and post-persistence summarization failures continue resolving to `saved_without_summary` without relying on the screen-level catch-all message path.
- Hardened Echo draft persistence in `features/echo/components/EchoScreen.tsx` by flushing the latest scoped draft immediately before submit and during teardown/context switches, while keeping the existing 500ms debounce for normal typing so fast submits or navigation-away events do not drop the most recent unsaved text.
- Reset Echo composer inline submission feedback more explicitly in `features/echo/components/EchoScreen.tsx` so prior notices are cleared when a new submit attempt starts and after a later fully confirmed save, preventing stale offline/error messages from lingering into subsequent successful attempts while preserving same-attempt feedback.

### Added (2026-04-05)
- Implemented intelligence gating and one-insight surfacing. Added `lib/ai/isProfileSufficient.ts` (pure function: returns true when at least 2 of `interests`, `strengths`, `challenges`, `patterns` in `character_profile` JSONB are non-empty arrays). Added `lib/ai/prompts/intelligence.ts` with s ystem pr mpt (single sentence, max 120 chars, observational not motivational) and `buildIntelligencePrompt` helper. Added `lib/ai/pipelines/intelligence.ts` to call `callLLM` through the existing chokepoint and enforce the 120-char cap. Added `intelligence` pipeline entry to `lib/ai/config.ts` (`enabled: true`; gated at the feature level by `FEATURES.INTELLIGENCE_ENABLED`). Added `app/api/intelligence/index+api.ts` (`POST /api/intelligence`): authenticates via Bearer token, fetches `character_profile` from Supabase, checks sufficiency, generates insight if sufficient, returns `{ insight, sufficient }` — returns 503 when feature flag is off. Added `cachedInsight`, `insightFetched`, `insightLoading` fields and setters to `features/profile/store.ts` for per-session insight caching. Updated `app/(app)/dashboard.tsx`: removed hardcoded `isProfileSufficient() { return false }` stub; `IntelligenceZone` now accepts `insight` and `isLoading` props and renders the insight text, a loading skeleton, or the dormant "Keep reflecting in Echo" copy; a `useEffect` calls `POST /api/intelligence` once per session when `INTELLIGENCE_ENABLED` is true, caching the result in the profile store. Fails silently — any error leaves the zone in the dormant state. Constraint enforced: max 1 insight, no list, no "see more."

### Changed (2026-04-05)
- Completed `summarized` flag wiring in `features/echo/services/echo-service.ts`: added `summarized: true` to the DB update payload that runs after a successful AI reflection, closing the loop on the `echo_entries.summarized` column added in migration 011.

### Added (2026-04-05)
- Added post-finalization action capture turn to goal creation flow. After goal persistence, `app/goals/create.tsx` now appends a hardcoded action prompt ("What's one action you can take today to start moving on this?") as an assistant message, keeps the chat input active for one more user response, POSTs the response to `POST /api/actions` (with today's date as `due_date`), appends a confirmation ("Locked in. You'll see this on your dashboard."), then navigates to the goal detail page after a 1.5s delay. If the action POST fails, navigation still proceeds — the action is a bonus, not a gate. Affected files: `lib/ai/prompts/goal-creation.ts`, `app/goals/create.tsx`.
- Added `ACTION_CAPTURE_PROMPT` and `ACTION_CAPTURE_CONFIRMATION` exports to `lib/ai/prompts/goal-creation.ts` with inline documentation of the post-finalization turn rules.
- Added `supabase/migrations/010_action_logs.sql`: creates `action_logs` table with `goal_id` (CASCADE), `user_id` (CASCADE), `action_text`, `status` (pending/complete/skipped), `due_date`, `completed_at`, and `created_at`. Indexes on `(goal_id, created_at DESC)` and `(user_id, status)`. RLS policies for SELECT, INSERT, and UPDATE gated on `user_id = auth.uid()`.
- Added `features/actions/types.ts`: `ActionLogStatus` union type and `ActionLog` interface matching the DB schema.
- Added `app/api/actions/index+api.ts`: `GET /api/actions` (query params: `goal_id` required, `status` optional, `limit` optional default 10 max 100) and `POST /api/actions` (body: `goal_id`, `action_text`, `due_date?`). Both read `user_id` from server-side session only.
- Added `app/api/actions/[id]+api.ts`: `PATCH /api/actions/:id` (body: `status?`, `action_text?`). Setting `status = 'complete'` automatically sets `completed_at = now()`. Validated against `user_id` from session; returns 404 if not found or not owned.
- Added `features/actions/hooks/useLatestAction.ts` to fetch the latest pending action for a goal via `GET /api/actions?goal_id=...&status=pending&limit=1`, expose loading/error state, and provide an independent `mutate()` revalidation path for the goal detail Next Action UI.
- Added `features/actions/components/NextActionSection.tsx` to render the goal detail Next Action card with loading, retry, pending-action, and inline create states. The section supports optimistic `Complete` / `Skip` interactions with rollback on PATCH failure and uses post-success revalidation after both PATCH and POST flows. Affected files: `features/actions/components/NextActionSection.tsx`, `features/actions/hooks/useLatestAction.ts`.

### Changed
- Updated `app/goals/[id].tsx` to insert `NextActionSection` directly below `GoalDetailHeader`, above `MeasurablesPanel` (which sits above `ActivityFeed`). Screen order: `GoalDetailHeader → NextActionSection → MeasurablesPanel → ActivityFeed`. Keeps the new action UI isolated from measurables and Echo logic. Affected file: `app/goals/[id].tsx`.
- Kept next-action creation on the lowest-risk path by revalidating with `useLatestAction().mutate()` after a successful `POST /api/actions` instead of introducing optimistic insert state. Notable limitation: the client still sends `status: 'pending'` for clarity, but the existing backend already hardcodes pending on insert, so no API contract change was required.

### Changed (2026-04-05)
- Refactored `app/(app)/dashboard.tsx` into a 3-zone layout: (1) Active Goal + Next Action, (2) Echo, (3) Intelligence placeholder. Removed the projects/goals list view. Zone 1 picks the most recently updated `status === 'active'` goal from `useGoals()`, renders the goal title, and shows the pending action via `useLatestAction(goalId)` with inline Complete/Skip handlers (same PATCH pattern as `NextActionSection`). Zone 2 is gated by `FEATURES.ECHO_ENABLED`, calls `useEntries()` to pre-populate the echo store, and shows a "Reflect in Echo" CTA plus a preview of the latest entry (first 100 chars + relative date). Zone 3 always renders: shows dormant copy while `INTELLIGENCE_ENABLED === false` or `isProfileSufficient()` is false (stub, always returns false; TODO Block 6). Projects remain accessible via the header `+` action. `GoalGrid`, `ProjectCard`, and `useProjectStore` are no longer imported; all other screens unchanged.

### Refactored
- Lifted `useActivity` ownership into `app/goals/[id].tsx` and updated `features/goals/components/ActivityFeed.tsx` to accept typed activity props, removing the duplicate goal activity fetch while preserving the existing feed rendering behavior.

### Fixed (2026-04-05)
- Fixed Vercel crash: `Uncaught SyntaxError: Cannot use 'import.meta' outside a module`. Root cause: Metro resolves `zustand/middleware` to `node_modules/zustand/esm/middleware.mjs` (ESM build), which contains `import.meta.env?.MODE` — a Vite idiom that is not valid in Metro's non-module script output. Patched `esm/middleware.mjs` lines 62 and 124 to replace `(import.meta.env ? import.meta.env.MODE : void 0)` with `process.env.NODE_ENV`. Generated `patches/zustand+5.0.12.patch` via patch-package and added `"postinstall": "patch-package"` to `package.json` so the patch re-applies on every `npm install` and Vercel deploy. Bundle confirmed clean: no `import.meta` in `dist/` after rebuild. TSC passes with no errors.
- Added measurable completion flow across `app/api/goals/complete-measurable+api.ts`, `lib/db/goals.ts`, `features/goals/hooks/useGoalDetail.ts`, `features/goals/components/MeasurablesPanel.tsx`, and `features/goals/components/MeasurableCard.tsx` so tapping a milestone checkmark now logs completion, recalculates persisted goal progress, reorders completed rows after incomplete ones, and updates the goal detail UI optimistically.
- Replaced the Flow A / Flow B ambiguity detection model in `lib/ai/prompts/goal-creation.ts` with a three-stage SPARK → SHAPE → DRAFT conversation model. Stage 1 (Spark) always fires on the first message with domain-aware context and 1-3 questions — no draft. Stage 2 (Shape) proposes a lightweight goal frame for confirmation before committing to structure. Stage 3 (Draft) produces the full 6-section scaffold after frame confirmation. Updated Core behavior to align with the new stage model and remove conflicting draft-first defaults.

### Changed (2026-04-05)
- Added `FEATURE_DISABLED` to `AiErrorCode` in `lib/ai/contracts.ts` and `AI_ERROR_CODES` in `lib/ai/errors.ts`; intelligence 503 now uses typed code `FEATURE_DISABLED` instead of `UNKNOWN_ERROR`. Affected files: `lib/ai/contracts.ts`, `lib/ai/errors.ts`, `app/api/intelligence/index+api.ts`.
- Standardized AI response contracts across all AI-backed endpoints. Created `lib/ai/contracts.ts` as the single source of truth for `AiErrorCode`, `AiSuccessResponse<T>`, `AiErrorResponse`, and `AiResponse<T> = AiSuccessResponse<T> | AiErrorResponse`. Updated `lib/ai/errors.ts` to expand `AI_ERROR_CODES` to all six values (`RATE_LIMITED`, `UNAUTHORIZED`, `INVALID_INPUT`, `AI_PROVIDER_ERROR`, `PARSE_ERROR`, `UNKNOWN_ERROR`), import `AiErrorCode` from contracts, and remove the old flat `AIErrorResponse` interface. Updated `app/api/goals/create+api.ts`, `app/api/echo/reflect+api.ts`, and `app/api/intelligence/index+api.ts` to wrap every response in the `AiResponse<T>` envelope (`ok`, `data`, `error`), preserving all existing HTTP status codes. Updated `features/echo/services/echo-service.ts` to parse `AiResponse<ReflectPayload>` and check `body.ok` / `body.error.code` instead of matching raw `AIErrorResponse` fields. Updated `app/(app)/dashboard.tsx` to parse `AiResponse<IntelligenceData>` and check `body.ok` instead of HTTP status alone. Updated `app/goals/create.tsx` to parse `AiResponse<GoalCreateData>` and read `body.error.message` / `body.data` from the envelope. TSC passes with zero new errors. No business logic, prompt content, pipeline logic, or RLS behavior was changed.

### Changed (2026-04-05)
- Restored GoalGrid and ProjectCard to dashboard; 5-zone layout finalized. Zone order: (1) Active Goal + Next Action, (2) Projects, (3) All Goals, (4) Echo, (5) Intelligence. `useProjectStore`, `GoalGrid`, and `ProjectCard` re-imported. `GoalGrid` receives `standaloneGoals` (goals where `projectId === null`) and `newestId`. `ProjectCard` iterates `projects` from `useProjectStore`. Loading gate updated to `goalsLoading || projectsLoading`. All Block 5 zone logic (active goal, next action, echo, intelligence) unchanged.

### Added (2026-04-05)
- Added pipeline observability to callLLM chokepoint — structured JSON events emitted via console.log, captured by Vercel. Fields: pipeline, model, latency_ms, tokens, error_code, user_id, timestamp. Emits after rate limit check on every provider call (success and failure). Error code classified from thrown value; errors rethrown unchanged. No signature change — user_id already present in CallLLMParams. Affected file: lib/ai/client.ts only.

### Added (2026-04-05)
- Added pipeline observability to callLLM chokepoint — structured JSON events emitted via console.log, captured by Vercel. Fields: pipeline, model, latency_ms, tokens, error_code, user_id, timestamp. Emits after rate limit check on every provider call (success and failure). Error code classified from thrown value; errors rethrown unchanged. No signature change — user_id already present in CallLLMParams. Affected file: lib/ai/client.ts only.
- Added Echo reconciliation: `app/api/echo/reconcile+api.ts` (`POST /api/echo/reconcile`) queries all echo_entries where summarized = false AND ai_insight_requested = true for the authenticated user, re-runs summarization via callEchoReflection, updates summarized = true on each success, and updates profiles.last_summarized_at after the batch. Single-entry failures are caught and logged without aborting the batch. Returns { reconciled: N, failed: M }. Dashboard triggers a fire-and-forget POST on mount via useRef-guarded useEffect (no render blocking, no loading state). Affected files: app/api/echo/reconcile+api.ts (new), app/(app)/dashboard.tsx.

### Added (2026-04-06)
- Created `types/vault.ts`: `VaultItemType` union, `VaultItemMetadata` typed object (url, annotation, fileType, aiConfidence, confirmed, tags), `VaultItem` interface, `Vault` interface. Pure types, no logic, no side effects. Follows L3 type rules from `types/CLAUDE.md`.
- Created `types/space.ts`: `SpaceType` union (`personal | team | institutional | community`), `SpaceRole` union, `SpaceMember` interface, `Space` interface. Pure types, no logic, no side effects.
- Created `types/echo-link.ts`: `EchoLinkSource` union (`manual | ai_suggested | ai_auto`), `EchoGoalLink` interface mirroring the `echo_goal_links` many-to-many bridge table. Pure types, no logic, no side effects.

### Changed (2026-04-06)
- Extended `types/activity.ts` `ActivityItem` discriminated union with three new variants (on `kind` field). All new variants share the required `id` and `timestamp` base fields per union contract. No existing variant shapes modified.
- Applied narrowing fix in `features/goals/components/ActivityFeed.tsx`: exhaustive switch on `kind` is now type-safe against the full `ActivityItem` union; previously unhandled variants no longer produce implicit `any` or dead-branch type errors. TSC clean after change.

## Block 0.1 — Duplicate auth callback fix (2026-06-19)

### Audited
- Compared `app/(auth)/callback.tsx` and `app/auth/callback.tsx`, traced `/callback` and `/auth/callback` references, and confirmed signup was hardcoded to `https://oharaai.vercel.app/auth/callback` while repo context still flagged `/auth/callback` as the broken path.

### Changed
- Updated `app/(auth)/signup.tsx` to send Supabase email confirmations to `https://oharaai.vercel.app/callback`, matching the auth route-group callback path exposed by Expo Router.
- Unified callback handling in `app/(auth)/callback.tsx` by normalizing the `code` param, exchanging PKCE codes, and verifying the resulting session before routing to dashboard or login.

### Fixed
- Removed the duplicate literal route `app/auth/callback.tsx` so the app now has a single callback implementation and a single public callback URL.

### Verification
- Verified route references with repo-wide search before edits.
- Manual verification still required for the live Supabase email-confirmation round-trip.

### Manual Test Required
- Create a test account from the signup screen, open the confirmation email, confirm the browser lands on `/callback`, and verify the user is routed to the expected post-auth screen without a 404.

### Risks
- If Supabase dashboard redirect URL allowlists still only include `https://oharaai.vercel.app/auth/callback`, they must be updated to include `https://oharaai.vercel.app/callback` for email confirmation to succeed in production.

## Entry Edit backend — server-side PATCH + re-embed (2026-07-10)

### Added
- New `PATCH /api/entries/:id` route (`app/api/entries/[id]+api.ts`): server-side
  content/title edit for echo entries. `withAuth` → `isEntryOwnedByUser()` → 404 if
  not owned (same gate as Move). Sanitizes + length-caps `content` (20000) and
  `title` (200) with the same `sanitizeString` discipline Move uses — deliberately
  NOT copying `createEntry`'s unbounded-content gap. `title` is clearable (null /
  empty → null).
- Reads the current entry first to detect a real content change and to check
  `ai_insight_requested`. **Only when `content` actually changed**: re-embeds inline
  server-side via `buildEchoEmbeddingText` → `generateEmbedding` (createEntry's STEP 1
  logic, ported off the client), and — if `ai_insight_requested` — flips
  `ai_status='pending'` (existing `echo/reconcile` job picks it up, untouched) and
  clears the now-stale reflection fields (`ai_response`, `summarized`, `processed_at`,
  `brt`, `brt_ai`, `emotion`, `confidence`, `model_version`; plus `retry_count`/
  `last_attempted_at` reset for a clean retry budget). Title-only edits touch nothing
  else. Embedding write is non-blocking (edit already committed).
- Client `updateEntry()` service fn in `features/echo/services/echo-service.ts`,
  same shape as `moveEntryRequest` (authedFetch + typed error kinds).

### Reconciliation note
- Task described this PATCH as living in `app/api/entries/[id]+api.ts` "same file as
  Delete's DELETE export" and adapting a route-handler `createEntry`. In this repo no
  such file/DELETE exists (only `entries/[id]/move+api.ts`) and `createEntry` is a
  client-side service. Created the file fresh with just the PATCH (natural home;
  DELETE can be added later) and ported createEntry's client-side embedding logic to
  the server, per the task's stated server-side intent.

### Validation
- `npx tsc --noEmit` clean.
