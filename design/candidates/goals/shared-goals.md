# Candidate: Shared Goals (goal "pacts" with device-verified progress)

**Feature area:** Goals
**Status:** Candidate (concept — not signed off, not scheduled)
**Logged:** 2026-09-24

---

## The idea

Let a user **invite a friend into a goal** as an active participant, not a
passive viewer — e.g. "help my friend improve their 5k over 2 months, and do it
alongside them." Both people work the *same* measure, the app shows **who
actually improved** without anyone doing manual math, and a shared workspace
holds the R&D artifacts (routines, links, findings) they discover together.

This is explicitly **different from Circles.** Circles (shipped, Home) shares a
*read-only whitelisted summary* of one owner's Goal (CD-004). A shared goal is a
**two-sided pact**: both parties are owners of their own progress, both log, both
see each other's activity, and the app computes a head-to-head.

The transparency currency is what the user already values: **Milestones + Recent
activity** (reflection-style progress), with **Milestones** as the unit that can
optionally graduate to public.

---

## The make-or-break decision: "how do we know who improved — automatically?"

If the app can't answer *"who improved their 5k, and by how much"* without a
spreadsheet, the feature is worthless. Two design choices make it deterministic:

### 1. Data model: **linked parallel goals**, not a co-owned single goal

Each person **owns their own goal** ("My 5k in 2 months"); the pact is a **link
between two individually-owned goals** plus a shared measure definition.

- **Why linked, not co-owned:** Ohara's spine is single-owner (`userId` always
  from server session; goals/tasks/vault FK to one owner; CD-004 says non-owners
  never read base tables). A co-owned single `goals` row fights that assumption
  in every query and RLS policy — and it would *still* have the same self-report
  problem. Linked parallel goals keep the privacy spine intact and make the two
  progress series naturally separable and comparable.
- **Mechanism:** extend the existing `goal_share_invites` table
  (migrations 053–054, `lib/db/circles.ts`) from *view-a-summary* to
  *active-partner*. A new pact row references both goals + the shared measure.

### 2. Shared measure contract (this is the actual unlock)

At invite time, both sides agree on **one measure**, instantiated as the *same*
canonical Task on each goal (`tasks` / `task_schedules` / `task_occurrences`,
migrations 047–051; `completion_mode: 'quantity'`). To make cross-person
comparison automatic and correct, the contract must carry **metric semantics**:

- `unit` (e.g. minutes)
- `direction` — **lower-is-better** (5k time) vs **higher-is-better** (distance,
  weight lifted). Without this the app can't tell improvement from regression.
- `baseline` — captured at pact formation (or first occurrence)
- optional `target`

Growth is then a **pure server-side computation over `task_occurrences`** — no
AI, no manual work:

```
improvement% = (baseline − current) / baseline      // lower-is-better
improvement% = (current − baseline) / baseline      // higher-is-better
```

The head-to-head view is a deterministic render of two time series: each
person's baseline→current %, a trend line, who's ahead. **Math decides.**

---

## Device verification is the default (Strava / Apple Health)

Decision (2026-09-24): a self-reported number isn't trustworthy enough for a
competitive head-to-head, so **device-sourced occurrences are the default**, not
a v2 add-on. This is the honest "3rd source of truth."

### The critical platform split (do not gloss over this)

**Strava and Apple Health are not the same kind of integration.**

- **Strava = server-side OAuth + REST API + webhooks.** Works on web and native.
  This is the pragmatic default: it already aggregates Apple Watch / Garmin / etc.
  for running & cycling, which covers the 5k use case directly. Server pulls
  activities, matches them to the measure, writes verified occurrences.
- **Apple Health (HealthKit) = device-local, iOS-only, native-module.** There is
  **no server API** — HealthKit data lives on-device and is read through a native
  bridge (e.g. an `expo-health`/HealthKit module) in the **iOS app only.** It
  **cannot** be read from RN Web or Vercel SSR. So HealthKit is a native-iOS
  follow-on, not the web default.

**Recommendation:** ship **Strava first** as the default verified source (covers
the flagship 5k case on every platform), add **HealthKit** as an iOS-native
enhancement later. Framing it as "device-verified by default" is honest *if*
Strava is the day-one path and manual entry is the always-available fallback.

### What device verification adds to the data model

- **Provenance on occurrences.** `task_occurrences` needs a `source`
  (`manual | strava | healthkit`) so a verified occurrence can be badged and
  optionally weighted differently from a self-reported one. This is the tier that
  makes the head-to-head credible.
- **Activity→measure matching logic.** A Strava "Run" of ~5 km must map to the
  "5k time" measure (activity type + a distance window → derive elapsed time).
  This normalization is non-trivial and is where correctness bugs will live.
- **Verification tier surfaces in the UI:** verified vs self-reported badge; the
  comparison can require verified data to count toward the competitive delta
  while still letting manual logs drive personal streaks.

---

## The privacy spine: private → partner → public

Everything here is really *"who sees what,"* and it extends CD-004 cleanly:

| Tier | Who | Sees | Status |
|---|---|---|---|
| **Private** (default) | Owner | Everything: reflections/BRT, personal vault, Task detail | exists |
| **Partner** (the pact) | The invited friend on *this* goal | Milestones + Recent activity + the shared measure series + the **shared-pact vault** | **new** |
| **Public** (opt-in) | Anyone | Individual **Milestones** only | partial (Circles) |

- The **Partner tier is a new whitelist** — richer than the passive
  `circles_goal_summary` because both sides opted in as active participants, but
  it is still a whitelist: partners see progress signals, **not** each other's
  private reflections or full Task/vault internals unless explicitly shared.
- **Personal vault stays private.** A **shared-pact vault** (bound to the pact,
  reusing Project-vault machinery) is where jointly-discovered artifacts live —
  and is the home for the resources/commerce layer (see
  `projects/goal-resources-commerce.md`).

---

## Where Intelligence fits — narrator, not judge (L3 AI contract)

The improvement **number is deterministic** (computed from `task_occurrences`)
and must **never** be AI-generated — an untrustworthy comparison kills the whole
feature. Ohara AI's honest jobs, all summarization-over-storage:

1. **Suggest the shared measure + milestone ladder at pact formation** (both
   confirm; never auto-applied — CLAUDE.md AI-confirmation rule,
   `metadata.confirmed` / `feedback.pending`).
2. **Plausibility flags** on suspicious manual entries ("40% jump in a week —
   confirm?"). Device-sourced occurrences largely retire this need.
3. **Narrate** the deterministic result ("you improved 8%, your friend 12%, but
   you've logged more consistently").

Model/route through the single chokepoint (`lib/ai/client.ts`); this is an
L3 AI-output-contract change and needs a DECISIONS.md entry.

---

## Why it fits Ohara

- **High reuse.** `goal_share_invites`, `circles_goal_summary`,
  `lib/db/circles-core.ts`, `features/circles/`, and the
  `FEATURES.CIRCLES_ENABLED` gating pattern (`constants/features.ts`) are the
  right precedents to extend rather than reinvent.
- **Canonical Tasks already produce the time series.**
  `task_occurrences` (quantity mode) *is* the measurement substrate — no new
  measurement engine, just metric semantics + provenance.
- **Milestones as the shareable primitive** aligns with the existing
  milestones-as-social-primitive direction.
- **Additive.** It's a new *relationship* between existing goals, not a new
  pillar; build it behind a feature flag like Circles.

---

## Risks (ranked, tied to architecture rules)

1. **Co-owned temptation.** If anyone models this as one shared `goals` row it
   breaks single-owner + CD-004 everywhere. Linked parallel goals is not
   optional — it's the load-bearing decision.
2. **Health data is sensitive (special-category / GDPR).** Strava OAuth tokens
   are secrets — encrypt at rest, store minimal scope, support revocation, pull
   only what the measure needs. Don't retain raw activity streams beyond the
   derived occurrence.
3. **SSR safety (CRITICAL).** Any HealthKit/native health module must be
   dynamically imported **client/native-only**, never at a module top level
   `_layout.tsx` reaches — it will throw at module-load in Vercel SSR. Web must
   degrade to Strava/manual.
4. **Activity→measure matching correctness.** The 5 km-window / activity-type
   mapping is the most bug-prone surface; a wrong match writes a wrong verified
   number, which is worse than a self-report. Needs its own tests.
5. **Metric direction must be explicit.** Omitting `direction` silently inverts
   "who won." It belongs in the contract, validated server-side.
6. **Self-report ceiling on the manual path.** Where device data is absent, the
   number is only as honest as the log. The *partner transparency layer itself*
   (both see each other's activity) is the v1 trust mechanism; device data is the
   hard-verification upgrade. Be honest in-product about which occurrences are
   verified.
7. **Non-blocking failures.** Mirror "vault/space creation must not block signup":
   a Strava sync failure, token expiry, or match miss must **never** block goal
   or pact creation — degrade to manual, log the error.
8. **Pact lifecycle.** Invite/accept/decline/withdraw already exists for
   `goal_share_invites`; a pact also needs *dissolve* semantics (one party leaves)
   and what happens to the shared vault + the other person's data on exit.
9. **Asymmetry & fairness.** Different baselines, different start dates, one
   person device-verified and the other manual — the comparison UI must handle
   uneven data honestly (show % improvement over absolute, badge unverified),
   or it feels rigged.

---

## Recommendation

Build behind a feature flag, in phases:

1. **Pact + shared measure contract** (linked parallel goals; metric semantics:
   unit/direction/baseline/target) with **manual logging** and the deterministic
   head-to-head. Extends `goal_share_invites`.
2. **Strava as the default verified source** — OAuth, activity→measure matching,
   `source` provenance on `task_occurrences`, verified badge.
3. **Partner transparency tier** (milestones + recent activity + shared-pact
   vault) as a new whitelist extending CD-004.
4. **HealthKit (iOS-native)** and **public-milestone graduation** as follow-ons.

Intelligence stays a narrator throughout; math owns the numbers.

**Open questions**
- Does device provenance (`source` on `task_occurrences`) also apply to **solo**
  goals? It's cross-cutting and probably should — worth its own candidate if so.
- Do verified occurrences *replace* or *coexist with* manual ones for the same
  day/activity (dedup rule)?
- Should the competitive delta require verified data, or just badge it?
- Pact size: strictly 1:1, or a small group (N runners)? Data model is the same;
  the comparison UI is not.
- Formal DECISIONS.md entries needed: the L3 AI-narrator contract, the new
  partner-tier whitelist, and `task_occurrences.source`.
