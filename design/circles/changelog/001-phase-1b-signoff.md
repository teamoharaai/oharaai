# Session 001 — Phase 1b: L3 sign-off + open questions Q1–Q4

- **Date:** 2026-09-17
- **Task(s):** PLAN.md Phase 1b (L3 sign-off gate)
- **Agent/model:** Opus 4.8, high effort
- **tsc baseline (before):** clean

## Goal of this session

Present draft Migration 053 (tables, RLS, RPCs, grants) for L3 sign-off, resolve
open questions Q1–Q4, record the decisions, and clear the Phase 1b gate so
Phase 2 (promote + apply) can begin in a later session.

## Changes

- No code or schema changes. All four answers (Q1–Q4) resolved to API-layer
  behavior over the existing 053 tables — none altered the schema, so
  `db/053_circles_social_layer.sql` and the local harness were left untouched.
- **`design/circles/DECISIONS.md`** — added CD-013 (Q1), CD-014 (Q2), CD-015
  (Q3), CD-016 (Q4), CD-017 (053 L3 sign-off).
- **`design/circles/OUTSTANDING.md`** — Phase 1b marked ☑; next action set to
  Phase 2 (promote + apply, blocked on user go-ahead); Q1–Q4 moved from open to
  resolved with CD pointers.
- **`design/circles/MEMORY.md`** — recorded the resolved Q1–Q4 contract and the
  sign-off as durable facts.

## Tests

- `npx tsc --noEmit` → pass (baseline and end of session).
- `design/circles/db/run-circles-security.sh` → `circles security: all
  assertions passed`; re-apply fails loudly as designed. Re-run confirms 053 is
  unchanged and still green after sign-off.

## Decisions made

- CD-013 · Encourage shows *who* (names on tap), hydrated via
  `get_profiles_by_ids`. No schema change.
- CD-014 · Declined goal invites are hidden from the owner's sent list
  (mapped declined→"Pending" at the API layer). No schema change.
- CD-015 · Feed posts linking a now-private / withdrawn Goal are kept
  (title snapshots, per CD-005). No schema change.
- CD-016 · Invite links are reusable and redeeming auto-sends a *pending*
  friend request (bidirectional consent). Actual `redeem_invite_link` (028)
  behavior to be verified in Phase 5.
- CD-017 · Migration 053 schema / RLS / RPC contract / grants approved (L3
  sign-off). Authorizes Phase 2 promotion; live apply still needs explicit
  per-session go-ahead.

## Follow-ups / handoff

- **Next action (Phase 2):** `git mv` `design/circles/db/053_circles_social_layer.sql`
  → `supabase/migrations/053_circles_social_layer.sql`; move the harness into
  `scripts/` (`circles-security-bootstrap.sql`, `circles-security.test.sql`,
  `test-circles-security.sh`), add `"test:circles:db"` to `package.json`, re-run.
  Then live pre-flight reads (0/1 public goals per user; `053` absent from
  `supabase_migrations.schema_migrations`; occurrence horizon covers the current
  week). **Stop and ask the user before applying live.**
- CD-013/016 carry implementation notes into Phase 3/5 (encourager list
  endpoint; invite-link redeem contract) — no schema impact.
