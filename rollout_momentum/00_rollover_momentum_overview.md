# Rollover + Momentum — Implementation Overview

**Scope:** Goal expiration/extension ("rollover") and the "Momentum"
dashboard section. Goal breakdown/QA structure is explicitly **excluded**
— tracked as a separate, isolated task since it involves Vaults.

**How to use this set:** Each numbered document below is meant to be
pasted into its own new conversation, in order. Each contains: locked
design context, a read-only audit to run first (CC, Sonnet), a Codex
prompt (some fields marked TBD pending that audit's findings), and a
Codex model/effort recommendation. Do not skip ahead — each phase depends
on the one(s) before it actually being merged.

## Build order

| # | Document | Depends on | Codex model/effort |
|---|---|---|---|
| 1 | Schema Migration | — | Terra, low |
| 2 | Extend-Goal Write Path | 1 | Sol, high |
| 3 | Superseded-Goal Read-Only Guard | 1, 2 | Terra, medium |
| 4 | Reflection / Echo Linking at Extension | 2 | Terra, medium (may bump to Sol — see doc) |
| 5 | Momentum Dashboard Section | 1, 2, ideally 4 | Terra, low–medium |

## Core locked decisions (apply across all 5 documents)

- **Row representation:** extending a goal creates a NEW `goals` row,
  not a mutation of the old one. New row's `previous_goal_id` points
  back to the old (now-superseded) goal.
- **Expiration trigger:** computed at read-time only (`deadline < now()`
  and not complete). No new persisted status, no scheduled job.
- **Locked summary (`prior_phase_summary`):** written once, at the
  moment of extension, onto the NEW goal. Type-aware:
  - `counter` → `{ title, achieved: current_value, target: target_value }`
  - `habit` / `checklist` → `{ title, completions: count(measurable_logs) }`
    over the old goal's lifetime
- **Reflection:** narrative is what's shown/emphasized to the user — an
  Echo entry, created via Echo's existing composer, linked to the **new**
  goal (not the old one) via `echo_entry_links`. Computed data
  (`prior_phase_summary`) is captured underneath, not the star of the
  UI.
- **Momentum section:** goals where `previous_goal_id IS NOT NULL`. No
  invented aggregate metric across the set (consistent with the earlier
  Projects decision — no fabricated progress numbers). No
  `cycle_number`/"Phase 3" labeling — not needed now, can be computed
  later by walking the chain if ever wanted.
- **Superseded goals** become read-only in the UI once something points
  back at them via `previous_goal_id` — not required for data integrity
  (the snapshot is already frozen), but keeps the historical record from
  being quietly editable after the fact.

## Explicitly out of scope, across all 5 documents

Goal breakdown/QA structure (separate task, involves Vaults), SMART
format refinements, Projects (closed thread), Echo composer UI changes,
any AI-generated reflection content (reflection is purely user-written).