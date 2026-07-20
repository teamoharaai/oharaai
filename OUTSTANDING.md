# OUTSTANDING.md

> Scannable checklist of deferred/open items. Not a narrative log — see `docs/DECISIONS.md` for
> the historical record and `CHANGELOGCODEX.md` for session-by-session changes. Check items off
> in place; don't delete them (move resolved items to the relevant log entry instead).

## Echo

- [ ] **RLS gap in `app/api/echo/reflect+api.ts`** — the route does not follow the canonical
      `getAuthContext` + `createAuthedClient` pattern (reference: `app/api/profile/index+api.ts`).
      It reimplements its own inline `getAuthContextFromRequest` (duplicate of
      `lib/api/auth.ts`'s `getAuthContext`), and `touchLastSummarizedAt()` writes to `profiles`
      via the raw `supabase` singleton (`lib/db/client.ts`, an anon-key client built for RN
      client-side session persistence) instead of a per-request authed client — the caller's JWT
      is never forwarded on that write, so RLS scoped to `auth.uid()` likely evaluates as
      unauthenticated and the update silently affects 0 rows. Found during 2026-07-01 profile
      route session (see `CHANGELOGCODEX.md`); explicitly left unfixed that session per user
      instruction. Needs its own audit/fix pass — likely also worth reconciling with the two
      duplicate auth-context implementations.
- [ ] **H2** — Echo prompt file duplication (`lib/ai/echo/prompts.ts` vs
      `lib/ai/prompts/echo-reflection.ts`), both still imported live by `reflect+api.ts` and
      `reconcile+api.ts`. Not duplicates (different pipeline stages), just split across
      directories. Scope before any Phase 2 Echo work.
- [ ] **H4** — `useEchoTrail` bypasses the API layer with a direct DB call
      (`features/goals/hooks/useEchoTrail.ts` → `getEchoEntriesForGoal()`). Not a security
      issue (RLS still scopes correctly via the browser's own session), but inconsistent with
      the API-layer pattern — misses rate-limiting/structured logging. Scope before Phase 2
      Echo work.
- [ ] **BRTClassification vs EchoBrt** — two BRT-related types coexist (`types/global.ts`'s
      `BRTClassification` and `features/echo/types.ts`'s `EchoBrt`, the latter also used by
      `types/activity.ts` and `lib/db/goals.ts`). Audit whether identical or diverging;
      consolidate to one definition if identical. Deferred since 2026-04 (docs/DECISIONS.md).
- [ ] Echo AI reflections are generated and stored but never rendered in the UI.
- [x] EchoTrail links point to a screen that doesn't exist. — Resolved 2026-07-10: the
      `/echo/[id]` detail route, `EchoDetailScreen.tsx`, and `getEntryById()` were deleted;
      the tap-through `Pressable` wrappers were removed from EchoTrail, ActivityFeed, and the
      EchoScreen list card (see CHANGELOGCODEX.md). EchoTrail/ActivityFeed cards are now
      view-only.
- [ ] **Extract `EntryActionMenu` to `components/ui/` so goal-trail + activity-feed echo cards
      can act on entries (edit/move/delete), not just view them.** As of 2026-07-10 the
      `/echo/[id]` detail route is gone and `EntryActionMenu` is the only way to act on an echo
      card — but it lives in `features/echo/` and `features/CLAUDE.md`'s no-cross-feature-import
      rule blocks `features/goals/` (EchoTrail, ActivityFeed) from importing it. Those two sites
      are intentionally inert (view-only, no tap, no menu) until the menu is extracted to
      `components/ui/` — the same move `ReflectionCard` already made in Block 2, for the same
      reason. Decision (Ariel): deferred, not built the session the route was removed.
- [ ] Migrate 14 existing `brt` read-sites to the `brt_ai`/`brt_user` split (migration `007`,
      see docs/DECISIONS.md 2026-06-24 "Echo BRT split"). `brt` is still the source of truth for
      all reads; not yet migrated. Known read-sites: `components/ui/ReflectionCard.tsx`,
      `features/goals/components/EchoTrail.tsx`, `features/goals/services/goal-service.ts`,
      `lib/db/echo-goal-links.ts`, `features/echo/hooks/useEntries.ts`,
      `features/echo/components/EchoDetailScreen.tsx`, `features/goals/components/ActivityFeed.tsx`,
      `features/goals/hooks/useEchoTrail.ts`, `lib/db/embeddings.ts`, `lib/db/goals.ts`.

### Echo Folders — Move-to-Folder (Session 4.1, 2026-07-09)

- [ ] **General folder is never auto-provisioned on entry save or folder list.**
      `get_or_create_general_folder()` fires *only* from the folder DELETE-reassign path
      (`app/api/folders/[id]+api.ts`); `createEntry` writes no folder link and `GET /api/folders`
      (`getFoldersForUser`) is a plain SELECT. So a user who has only saved entries has no General
      folder — container-less entries just float with no confirmed link (→ no pill). **Open design
      question (CTO + VP Product):** should container-less entries auto-land in General? If yes,
      `createEntry`'s write path needs a General-link write. Deferred to the migration-squash
      session (write-path change). Blocks manual-checklist item 9 (General as a move target).
- [ ] **`createEntry` legacy dual-write to `echo_entries.goal_id`.** Session 4.1 made the *read*
      path canonical (pills now come from the confirmed `echo_entry_links` row, not the
      `echo_entries.goal_id → goals()` join). The *write* path still sets both `echo_entries.goal_id`
      and the `echo_entry_links` row. Reconcile/remove the legacy `goal_id` write during the
      migration-squash session — deliberately untouched in 4.1 (read-only fix).
- [ ] **Apply migration `016_echo_entry_links_one_confirmed.sql` to the live DB, and first verify
      no existing flow can now hit its unique index.** The new partial unique index enforces ≤1
      `confirmed = true` row per `echo_entry_id`. Before applying to prod, confirm the echo-links
      review confirm flow (`confirmLink`) cannot set a second confirmed row on an entry that
      already has a confirmed container — that INSERT/UPDATE would now fail with a unique
      violation. Believed unreachable today, but unverified against live data.
- [ ] **Orphaned `folderId` field on `EchoEntry`.** `features/echo/types.ts`'s `folderId` is now
      populated (canonical read + optimistic `setEntryContainer`) but read by no UI — only
      `folderName` renders. Kept for symmetry with `goalId`. Remove it, or consume it when a
      folder-detail view lands.
- [ ] **No app-wide 401 / re-auth interceptor.** `PATCH /api/entries/[id]/move`'s 401 is surfaced
      as a generic message with no session-recovery path; same ad-hoc pattern in
      `features/goals/hooks/useVault.ts` (`setError('Unauthorized')`). Needs a dedicated
      auth-handling pass (unified 401 → refresh/re-auth), then wire the move flow (and others)
      into it. Flagged in the Opus review of PR #7.
- [ ] **404 entry-vs-target disambiguation is string-based.** `moveEntryRequest`
      (`features/echo/services/echo-service.ts`) distinguishes "entry gone" from "target gone" by
      matching `/target/i` against the server's error message (both are HTTP 404). Fragile — a
      structured error `code` from `PATCH /api/entries/[id]/move` would be robust. Deferred (would
      require touching the move route's response contract).
- [ ] **No Edit / Delete entry actions.** `EntryActionMenu` exposes only "Move to folder"; there is
      still no update-entry or delete-entry API route / DB function (confirmed in Session 4's Step 0
      audit). Separate session when that backend is built.

## Goals / API layer

- [ ] **Goal `echoLinkCount` includes unconfirmed links.** `fetchGoalSignals()` in
      `features/goals/services/goal-service.ts` counts every goal-container link without
      filtering `confirmed = true`, so the enrichment can include pending AI suggestions.
      Confirmed while adding the active-goal feed data layer on 2026-07-20; deliberately left
      unchanged because signal enrichment and its callers were out of scope.
- [ ] `/api/goals` returns HTTP 201 even when goal creation soft-fails (`goalId: null`,
      `error` populated in body). Current consumer (`create.tsx`) already handles this
      correctly by checking the body, so not urgent, but any future consumer trusting HTTP
      status alone would be misled. Fix: have the route return 4xx/5xx when `result.goalId`
      is `null`.
- [ ] `getAuthContext()` in `lib/api/auth.ts` returns `null` for both "no token" and "DB not
      configured," causing `/api/goals` to return 401 instead of 503 for the latter case —
      inconsistent with the other un-migrated routes' behavior. Minor; fold into the eventual
      backfill of those routes onto the shared auth helper.
- [x] Live HTTP round-trip for `POST /api/goals/complete-measurable` and
      `GET /api/goals/activity` — confirmed 2026-06-22 against goal
      `0ce941b6-4230-4aff-8b3f-690a3193dbe7`. Both return 200 post-migration-026; `mode` CHECK
      tightening causes no regression. See docs/DECISIONS.md.
- [ ] Remaining 12 API routes still use local/inline auth logic, not `lib/api/auth.ts` or
      `lib/api/contracts.ts`. Intentional per Block 1 scoping (backfill opportunistically as
      routes are touched), not a bug — listed here so it isn't mistaken for forgotten work.
- [ ] Whether `goals.mode` stays a fixed `'commitment'` default or gets real Phase 2 wiring
      (open question for CTO, see docs/DECISIONS.md 2026-06-22 entry).

## Actions

- [ ] `action_logs.due_date` is client-generated (`new Date().toISOString().split('T')[0]`) —
      known timezone bug: a user in UTC-8 at 11pm gets tomorrow's date. Originally flagged as
      "revisit before action completion UI ships" (docs/DECISIONS.md, 2026-04-05) — that UI
      (`NextActionSection`) has since shipped and is live, so this is no longer pre-launch debt,
      it's an active unaddressed bug.

## Account / Sidebar

- [ ] **`interests_user` comma-separated text input is v1 only.** `components/layout/AccountModal.tsx`
      stores/edits `interests_user` as a single comma-separated `TextInput`, split/joined to and
      from a `string[]` on load/save. A tag/chip input is the correct long-term pattern (clearer
      affordance for adding/removing individual interests, no ambiguity around commas inside a
      single interest). Added 2026-07-01, deferred to keep the Account modal scope to
      wiring/validation rather than a new input component.
- [ ] **No avatar image cache-clear on logout.** `components/layout/AvatarMenu.tsx`'s
      `handleSignOut` cannot clear any cached avatar image on logout — the app uses React
      Native's core `Image` component (`expo-image` is not installed), which has no
      cross-platform cache-clear API (unlike `expo-image`'s `Image.clearDiskCache()` /
      `clearMemoryCache()`). Practical impact should be minimal (avatar URLs are per-user paths
      in the `avatars` bucket, so a stale cached image would only resurface if a *different* user
      logs into the same device and somehow reuses the same URL, which the `{user_id}/avatar.jpg`
      path scheme prevents) — but flagging since it was an explicit Step 4 requirement this
      session and no fix was available. Revisit if the app ever adopts `expo-image`.
- [ ] `expo-image-picker` (`~55.0.21`) was added as a new dependency 2026-07-01 for the Account
      modal's avatar upload flow (`components/layout/AccountModal.tsx`). First use of this
      package in the repo — no other picker/media patterns to cross-check against yet.

## Vaults

- [ ] `features/goals/hooks/useVault.ts` bypasses `app/api/vaults/[goalId]+api.ts`
      (and `app/api/vaults/items/[itemId]+api.ts`) — vault item creation goes direct
      client-to-DB, the same pattern goal creation used before Block 1's fix. Not yet
      remediated.

## Phase 2 (explicitly deferred, no action needed yet)

- [ ] `profile_embeddings` junction table — deferred to Phase 2, only needed for "smarter
      candidate extraction context" retrieval (Qdrant-era use case). Blocks 1–4 deliver the
      complete embedding pipeline without it.
- [ ] Thorn → Goal suggestion loop — requires Discovery feature and pattern analysis layer,
      Phase 2 only.

## Typography (Phase 3 conversion)

- [ ] `features/echo/components/EntryCard.tsx:25` — raw `<Text>` (`{ color: '#1A1F1C', fontSize: 14,
      lineHeight: 20 }`, `numberOfLines={3}`, renders `entry.content`) is a near-identical
      structural analog to the preview text converted in `ActivityFeed.tsx` (`item.preview`,
      now `variant="content"` with a `text-[13px] leading-5` override) — same role (truncated
      preview tied to a content item), 1px off in fontSize. Flagged during the ActivityFeed
      audit/conversion session (2026-07-03); not touched then, since it's a separate file with
      its own conversion pass coming. Candidate for the same `content` + override treatment
      when `EntryCard.tsx` is converted.
- [ ] `components/layout/AccountModal.tsx:210` and `components/layout/SettingsModal.tsx:108` —
      raw `<Text className="text-sm text-[#6B7B6E]" style={{ fontFamily: 'Inter-Regular' }}>`
      error-state copy, matches the new `subtitle` variant (`components/ui/Typography.tsx`,
      added 2026-07-03 during the `EchoScreen.tsx` conversion pass, justified by this exact
      cross-file signature repeating 4x across `EchoScreen.tsx`/`AccountModal.tsx`/
      `SettingsModal.tsx`). Not converted this session — out of scope, own conversion pass
      needed for those two files.
- [ ] `components/layout/SettingsModal.tsx:132` — raw
      `<Text className="text-xs text-[#6B7B6E] mt-2" style={{ fontFamily: 'Inter-Regular' }}>`
      helper copy, matches the new `hint` variant (`components/ui/Typography.tsx`, added
      2026-07-03 alongside `subtitle`, same conversion pass). Not converted this session —
      out of scope, own conversion pass needed for `SettingsModal.tsx`.
- [ ] `app/(app)/constellation.tsx:104-115`, `app/(app)/explore.tsx:18-29`, and
      `components/AffiliateTeaser.tsx:69-77` — all match the new `description` variant
      (`components/ui/Typography.tsx`, added 2026-07-03 during the `MeasurablesPanel.tsx`
      conversion pass, justified by this signature repeating 5x across 5 files). Not converted
      this session — out of scope, own conversion pass needed for each file.
      `AffiliateTeaser.tsx:69-77` also currently has the zero-font-family bug (no `fontFamily`
      declared at all), which the `description` variant conversion will fix as a side effect.
- [ ] `features/goals/components/GoalDetailHeader.tsx:67-71` — also a `description` variant
      candidate, but uses `lineHeight: 22` instead of the other 4 occurrences' `lineHeight: 21`
      (variant is defined with `leading-[21px]`). Confirm whether 22 is an intentional
      deviation or drift before converting — don't assume it should silently conform to 21.
- [ ] `features/goals/components/GoalDetailHeader.tsx:87` — raw
      `<Text style={{ fontSize: 13, color: '#9CAF9F' }}>No deadline set</Text>`, zero
      font-family. Matches `MeasurablesPanel.tsx`'s "+ Add milestone" trigger label signature
      exactly (13px, `#9CAF9F`, no lineHeight) — only 2 occurrences repo-wide as of 2026-07-03,
      below the 3+ threshold for a new variant. Watch-list: re-run the cross-repo search if a
      third occurrence turns up.
- [ ] `app/(app)/dashboard.tsx:378` — raw `<Text className="mb-4 font-sans text-[15px]
      text-[#6B7B6E]">No active goal yet.</Text>`, no `lineHeight`, no explicit `fontFamily`
      override beyond the `font-sans` class. Incidental find during the `projects/create.tsx`
      cross-repo search (2026-07-03) for the `body`+`{fontSize:15, lineHeight:22}` override
      pattern (see `projects/[id].tsx:330`/`:357`, `projects/create.tsx:72`) — same fontSize/
      color, missing lineHeight, so not confirmed as the same signature. Not chased further
      this session; possible fourth occurrence if a future pass wants to fold it in.

- [ ] `app/(auth)/signup.tsx:79,85` and `app/(auth)/login.tsx:54` — error/success banner text
      (`text-sm text-red-600` / `text-sm text-green-700`, both zero-font-family) uses raw
      Tailwind semantic red/green, not the `STATUS.error`/`STATUS` tokens added 2026-07-0x in
      `constants/colors.ts` (`STATUS.error.text: '#92400E'`, plus a `pending` entry that reads
      like a mis-named `success` case — worth a second look). Flagged during the signup/login
      Typography audit (2026-07-03) as a STATUS-token question, not a Typography-variant one —
      out of scope for that pass. Needs its own decision: reconcile these banners onto
      `STATUS`, or confirm `STATUS` isn't meant to cover this case at all.

- [ ] `components/ui/Input.tsx:22` — raw `<Text className="text-sm font-medium text-near-black mb-1.5">{label}</Text>`
      (used by `components/layout/AccountModal.tsx` for Display name/Bio/Timezone/Interests
      labels) matches the new `field-label` variant (`components/ui/Typography.tsx`, added
      2026-07-03 during the signup/login conversion pass, justified by this exact signature
      repeating 3x across `signup.tsx`/`login.tsx`/`Input.tsx`). Not converted this session —
      out of scope, own conversion pass needed for `Input.tsx`.

## Known nav gaps

- [ ] `app/goals/create.tsx` lives outside the `(app)` route group — same sidebar-loss bug
      as the four routes fixed on 2026-07-02 (projects/[id], projects/create,
      goals/[id]/index, goals/[id]/vault). Deliberately left out of scope for that session.

## Accessibility / Focus management

- [ ] **`aria-hidden` focus violation on Modal open (console warning: "Blocked aria-hidden
      on an element because its descendant retained focus").** Reproduces after clicking into
      a project (triggers the Edit/Delete modals in `app/(app)/projects/[id].tsx`). Root cause:
      react-native-web's `Modal` marks the background app container `aria-hidden` when opened,
      but the `Pressable`/`TouchableOpacity` that triggered the modal (e.g. the Edit/Delete
      button) never has its focus moved or blurred, so the browser flags a focused descendant
      being hidden. No app code sets `aria-hidden` directly — this is RNWeb's own Modal
      behavior. Most call sites (`projects/[id].tsx`, `goals/[id]/vault.tsx`,
      `components/layout/SettingsModal.tsx`, `components/layout/AccountModal.tsx`) share the
      wrapper `components/ui/Modal.tsx`, which has no focus management (no autofocus into the
      modal, no blur-on-trigger). `features/echo/components/EchoScreen.tsx` bypasses the
      wrapper and imports `Modal` directly from `react-native`, so a fix isn't contained to one
      file. Needs its own session: (1) live repro in-browser to confirm the exact focused node,
      (2) pick a fix pattern (e.g. `ref` + `tabIndex={-1}` + `.focus()` on the modal container
      when `visible` becomes true) in `components/ui/Modal.tsx`, (3) decide whether
      `EchoScreen.tsx` migrates to the shared wrapper or gets the same fix applied
      independently, (4) manually verify each modal call site in-browser (no automated coverage
      for this). Found during 2026-07-06 console-warning triage audit, deliberately left
      unfixed (read-only pass).
