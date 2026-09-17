# Circles — Working Directory

Single home for the Circles initiative: the plan, the compounding cross-session
context, and the documentation an agent needs to resume with full context.

## What Circles is

**Circles** is the internal name for the friends-only social layer that now *is*
Home (`/dashboard`, still labeled **Home** in the nav). It lets people grow
alongside people they care about without turning Ohara into engagement-driven
social media:

- Everything (Goals, notes, reflections) is **private by default**.
- A user may make **one Goal public** — every friend can view it (view only).
- Any other Goal is visible only to friends **explicitly invited**, who accept or
  decline in **Requests**; accepted Goals appear in **Shared with You**.
- The **feed** lets friends post updates that *link* a Goal, milestone or
  reflection by **title + short description only**.
- **Encourage** (public counts), **Comment**, and a private **Saved** collection.
- Progress everywhere = **completed milestones / total**, plus **this week's Task
  count** (CD-003).

## Files

| File | Purpose |
|---|---|
| `PLAN.md` | Source-of-truth buildout plan (Phases 0–8) with acceptance criteria. Record deviations in `DECISIONS.md`; don't silently edit settled decisions. |
| `MEMORY.md` | Compounding facts: repo realities, gotchas, confirmed live-DB state. **Read first every session.** |
| `DECISIONS.md` | ADR-style decision log, IDs `CD-NNN` (Circles-Decision). |
| `OUTSTANDING.md` | Live phase board: status, blockers, exact next action. |
| `changelog/` | One file per work session (`NNN-<slug>.md`, use `TEMPLATE.md`). |
| `audits/` | Point-in-time verification reports (local DB security runs, live-DB checks). |
| `db/` | **Draft** Migration 053 + isolated local security harness (not yet promoted to `supabase/migrations/` / `scripts/`). |
| `prompts/` | Ready-to-paste session prompts for Claude Code. |

## Session protocol (every agent, every session)

1. **Read** `MEMORY.md` → `OUTSTANDING.md` → the active phase in `PLAN.md` →
   relevant `DECISIONS.md` entries. Also root `CLAUDE.md`, `AGENTS.md`,
   `CONTEXT.md`, and the nested `CLAUDE.md` of any directory you touch.
2. **Baseline:** `npx tsc --noEmit` (record clean/dirty in the session changelog).
3. **Work** the active phase only, on branch `feat/circles-home` (never commit to
   `main`; commit only when the user asks).
4. **Test:** `npx tsc --noEmit` + `design/circles/db/run-circles-security.sh`
   (or `npm run test:circles:db` once promoted) + any new unit tests.
5. **Document, in this order:**
   - `changelog/NNN-<slug>.md` (what, why, files, test results).
   - `OUTSTANDING.md` (phase status, blockers, next action).
   - New judgment calls → `DECISIONS.md`.
   - Durable facts/gotchas → `MEMORY.md`.
   - Verification runs with an acceptance gate → `audits/`.
   - Root `CHANGELOGCODEX.md` entry.
6. **Handoff:** leave `OUTSTANDING.md` precise enough that a cold agent knows the
   exact next action.

## Current status (session 000, 2026-09-17)

**Phase 0 (prototype) and Phase 1 (migration draft) complete.** The fixture-backed
prototype is committed and pushed on `feat/circles-home` (`f083ba5`). Draft
Migration 053 passes the isolated local security suite. **Next: Phase 1b —
L3 sign-off on 053 (CEO/CTO), then Phase 2 (promote + apply live).** See
`OUTSTANDING.md`.
