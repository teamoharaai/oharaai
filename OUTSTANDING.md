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
- [ ] EchoTrail links point to a screen that doesn't exist.
- [ ] Migrate 14 existing `brt` read-sites to the `brt_ai`/`brt_user` split (migration `007`,
      see docs/DECISIONS.md 2026-06-24 "Echo BRT split"). `brt` is still the source of truth for
      all reads; not yet migrated. Known read-sites: `components/ui/ReflectionCard.tsx`,
      `features/goals/components/EchoTrail.tsx`, `features/goals/services/goal-service.ts`,
      `lib/db/echo-goal-links.ts`, `features/echo/hooks/useEntries.ts`,
      `features/echo/components/EchoDetailScreen.tsx`, `features/goals/components/ActivityFeed.tsx`,
      `features/goals/hooks/useEchoTrail.ts`, `lib/db/embeddings.ts`, `lib/db/goals.ts`.

## Goals / API layer

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

## Known nav gaps

- [ ] `app/goals/create.tsx` lives outside the `(app)` route group — same sidebar-loss bug
      as the four routes fixed on 2026-07-02 (projects/[id], projects/create,
      goals/[id]/index, goals/[id]/vault). Deliberately left out of scope for that session.
