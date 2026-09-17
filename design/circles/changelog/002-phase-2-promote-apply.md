# Session 002 — Phase 2: promote + apply Migration 053 live

- **Date:** 2026-09-17
- **Task(s):** PLAN.md Phase 2 (promote + apply live)
- **Agent/model:** Opus 4.8, high effort
- **tsc baseline (before):** clean

## Goal of this session

Promote signed-off Migration 053 (CD-017) into `supabase/migrations/`, promote
the security harness into `scripts/`, apply 053 to the live database with user
go-ahead, and verify the schema/RLS/RPC/grant surface live.

## Changes

- **`git mv`** (renames, history preserved):
  - `design/circles/db/053_circles_social_layer.sql` →
    `supabase/migrations/053_circles_social_layer.sql`.
  - `design/circles/db/circles-security-bootstrap.sql` → `scripts/…` (same name).
  - `design/circles/db/circles-security.test.sql` → `scripts/…` (same name).
  - `design/circles/db/run-circles-security.sh` →
    `scripts/test-circles-security.sh` (renamed to the repo `test-*-security.sh`
    convention). `design/circles/db/` is now empty.
- **`scripts/test-circles-security.sh`** — repointed paths to the repo-root
  convention (mirrors `test-tasks-security.sh`): `CIRCLES_REPO_ROOT=…/..`,
  bootstrap/test from `scripts/`, `MIGRATION_053` from `supabase/migrations/`;
  refreshed the header (dropped the "DRAFT / when promoted" note).
- **`package.json`** — added `"test:circles:db": "bash scripts/test-circles-security.sh"`.
- **`types/supabase.ts`** — regenerated from the live schema after apply
  (1960 → 3512 lines; prior file was stale ~migration 034).
- **`supabase/CLAUDE.md`** — added the 053 ledger entry.
- **Live DB (`rrgiqemscnyaqkculnmb`)** — applied 053 (transaction-wrapped via the
  management API) and inserted the `schema_migrations` tracker row. Latest
  applied migration is now **053**.

## Tests

- `npm run test:circles:db` → `circles security: all assertions passed` (from the
  promoted `scripts/` location; non-idempotent re-apply still fails loudly).
- `npx tsc --noEmit` → pass (baseline, after promote, after types regen).
- Live post-apply verification (see `audits/001`): 5 tables + RLS, partial unique
  index, 13 functions, correct policy counts, and the CD-004 grant boundary
  (`circles_goal_summary` not executable by `authenticated`).

## Decisions made

- None new. Apply was authorized under **CD-017** plus explicit in-session
  "Apply now" go-ahead.

## Follow-ups / handoff

- **Next action (Phase 3):** build `lib/db/circles.ts` + `app/api/circles/**`
  per PLAN §4, mirroring friends (`withAuth`, `createAuthedClient`, Postgres
  error mapping `42501`→403, `P0002`→404, `22023`→400); add routes to root
  `API_CONTRACT.md`; add a smoke script like `scripts/momentum-api.smoke.mjs`.
  Fold in CD-013 (encourager list) and CD-014 (declined→pending map) at the API
  layer.
- **Risk to carry:** active daily task `985be6df` has no materialized
  occurrences (pre-existing Tasks gap, not 053) → weekly count under-reports
  (shows nothing), never wrong data. Verify/resolve in the Tasks lane / Phase 5.
