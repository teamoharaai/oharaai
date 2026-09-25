# Candidate: Character Traits (a Big Five mirror over Momentum)

> Status: **candidate / design** (no code yet). Extends the Momentum surface.
> Author: design session 2026-09-24.

## One-line

A behavioral "character mirror" that shows users which qualities their real
actions are building — even indirectly ("a little consistency shows discipline")
— using **Big Five (OCEAN) domains as the persistent top level and Ohara-measurable
facets underneath**, scored **primarily from evidence** (a deterministic engine
that reuses Momentum), narrated by the LLM, and then fed back into goal creation
so the goal chat can tailor itself to who the user has proven themselves to be.

## Why this, why now

- Ohara already has the *spine* for this and it is currently under-used:
  - `profiles.character_profile` JSONB (`interests`, `strengths`, `challenges`,
    `patterns[]`), the `isProfileSufficient()` gate, and the `intelligence_enabled`
    consent toggle.
  - The **Intelligence pipeline** (`lib/ai/pipelines/intelligence.ts`) — an
    established *observational, never-celebratory* voice contract.
  - The **Momentum engine** (`features/momentum/`) — a full, versioned,
    deterministic behavioral scorer with a normalized event taxonomy, evidence
    eligibility, EWMA smoothing, reason codes, and receipts.
- The user's requirement is **"rewarding but primarily truthful, with a clear
  output."** Momentum already solves the truthful/auditable half. Character is a
  *second projection over the same events*, not a new data pipeline.
- It closes a loop: behavior → character → better goals → more behavior.

## Core idea: Character is a second reducer over the Momentum event stream

Momentum answers **"how much are you moving?"** Character answers **"who does
this movement show you to be?"** Same evidence (`MomentumEvent` /
`MomentumWeeklyAggregates`), different projection.

Concretely, Character reuses from `features/momentum/`:
- the **event ingestion + eligibility** (`MomentumEventType`, `eligibility`,
  `exclusionReason`) — nothing counts toward a trait that wouldn't count toward
  Momentum, so the two surfaces can never contradict each other;
- the **pure scoring helpers** (`dynamicWeightedScore`, `clamp`, `smooth`,
  `ratio`, `normalizedReferenceScore`) — reuse verbatim;
- the **week boundaries / timezone / trust boundary** (`time.ts`,
  `trust-boundary.test.ts`, `security.test.ts`) — userId server-side only;
- the **reason-code + receipt pattern** — every trait level ships with the raw
  counts that produced it.

## The trait model: OCEAN domains → facets → signals

**Design rule that makes the whole thing honest:** never show a trait we cannot
tie to a real, already-collected signal. If there is no signal, the facet is
**dormant** ("not yet showing"), never "low" and never negative.

The user's key insight — *"OCEAN as the main categories so that subtypes resolve
the dormant mode for categories that go stale"* — is implemented as:

- **Domain = Foundation (lifetime, persistent).** A domain reflects who you've
  shown yourself to be over your whole history. It does **not** decay.
- **Facet = Momentum (rolling ~30d, can go dormant).** A facet reflects what
  you're *actively* exercising. Facets decay to "resting" when eligible evidence
  stops (same EWMA + eligibility Momentum already uses).

So a user always sees a stable "who you are" *and* a live "what you're
strengthening / what's gone quiet" — the domain holds even when a facet rests.

### Domain → facet → signal map

| OCEAN domain | Facet (subtype) | Primary Ohara signals | Reuses Momentum |
|---|---|---|---|
| **Conscientiousness** | Discipline / Self-regulation | task_occurrence completion rate, on-schedule rate, meaningful active days, weekly streak | **consistency** pillar |
| | Follow-through / Achievement | milestones completed vs. set, goal.complete, milestone velocity | **progress** pillar, `milestoneVelocity` |
| | Planning / Orderliness | weekly intentions, plan adapted, next-step scheduled | **initiative** pillar |
| **Openness** | Curiosity / Breadth | # active categories, adopting a new category, variety of goal.created | `portfolioCoverage`, `growthCadence` |
| | Reflectiveness | qualified Echo reflections, weekly reviews | **reflection** pillar |
| | Creativity | Learning & Creativity category activity | category-scoped evidence |
| **Extraversion**¹ | Social initiative | Circles: encouragements *given*, goals made public/shared, comments | Circles events |
| | Expressiveness | posts created, reflections shared | Circles events |
| **Agreeableness**¹ | Supportiveness / Generosity | encouragements given, saving/celebrating others' posts | Circles events |
| | Reliability to others | shared-goal pacts kept, team-space commitments | (shared-goals candidate) |
| **Resilience**² (inverse Neuroticism, positively framed) | Recovery | return after disruption, recovery.action_completed, goal.resumed | `RETURN_AFTER_DISRUPTION`, **initiative** |
| | Steadiness under load | sustained growth, low week-to-week variance, cadence held through disruption | `sustainedGrowth` |
| | Composure | Echo BRT: Thorn → next-step (processing setbacks into action) | reflection→action |

¹ **Extraversion & Agreeableness are honestly gated.** Their signals are almost
entirely social (Circles). If Circles is off or quiet, these domains stay
**dormant**, not zero — we do not infer sociability we cannot observe. This is a
truthfulness feature, not a gap.

² **Neuroticism is never shown as a deficit.** It is reframed as **Resilience**
and only ever measured *positively* (evidence of recovery/steadiness). Absence =
"not yet showing," matching the Intelligence voice rule (never discouraging).

## Scoring: hybrid engine + mandatory LLM narrator

Per the user's call: **hybrid**, with **LLM narration non-negotiable.**

1. **Engine floor (deterministic, source of truth).** Facet raw score from its
   signals via `dynamicWeightedScore`; EWMA `smooth` for stability; evidence
   eligibility → a facet with no eligible evidence returns **dormant, not 0**.
   Domain score = weighted roll-up of its facets. Tiers assigned by threshold:
   **Emerging → Developing → Strong → Signature**. Every facet emits reason codes
   + a **receipt** (the raw counts). Fully reproducible and auditable.
2. **LLM refine (the "hybrid" ± band).** The LLM may adjust a facet by **at most
   ±1 tier**, and **only with a stated, evidence-cited reason** (e.g. it reads
   three "Thorn → action" Echo entries as Composure the counter under-weighted).
   Both the engine value and the LLM delta+reason are stored, so the score stays
   explainable and the refine can be audited or disabled.
3. **LLM narrator (always on).** Writes the Ohara-voiced observation per domain
   and facet, citing the receipt. Inherits the Intelligence contract:
   observational, second person, never celebratory or discouraging, no
   superlatives. This is the "personality-test result" text the user reads.

### Rewarding but truthful — it's the *shape of the curve*, not a lie

- **Low bar to appear** — a little real evidence surfaces a facet as *Emerging*.
  This honors "even the tiny details" and feels rewarding.
- **Steep, evidence-gated top** — *Signature* requires sustained, cross-goal
  evidence. You cannot inflate your way there.
- **Decay is honest, not punishing** — facets fade to *resting* when you stop
  (EWMA), but the **domain Foundation never decays** — you don't "lose"
  character, the spotlight just moves. This is exactly the user's "dormant mode."

## Surface: a Character lens inside Momentum

Character lives **on the Momentum surface**, reusing the momentum service's event
fetch, week boundaries, and normalization:

- New projection alongside `useMomentumHomeSummary`, e.g.
  `useMomentumCharacterSummary` → a `characterSummary` payload (5 domains, each
  with facets, tier, receipt, narration, and a dormant/active flag).
- Display: five OCEAN domains (Foundation tier), each expandable to its facets
  with tier + receipt + one-line narration, plus a **"strengthening now" vs
  "resting"** split driven by facet Momentum.
- Owner-private (like Constellation). **Never** part of `circles_goal_summary`;
  never visible to friends.

## Part B: trait-aware goal chat (upgrade in place)

Per the user's call: **upgrade the existing goal chat**, not a separate mode.

- Add a **character context block** to `GOAL_CREATION_SYSTEM_PROMPT` (built like
  `buildIntelligencePrompt`): OCEAN domains + top active facets + dormant facets +
  `interests`/`challenges` from `character_profile`.
- `app/api/goals/chat+api.ts` already has auth; add a **non-blocking** fetch of
  the character summary, gated on `intelligence_enabled`.
- The chat then: opens discovery grounded in traits ("your Conscientiousness is
  strong but Openness has been resting — deepen something, or explore new
  ground?"), tailors clarifying questions, and biases the three finalize
  templates toward demonstrated strengths while gently stretching a dormant
  facet. **Output schema is unchanged** (`[[GOAL_READY]]` → 3 templates).
- **Must degrade to today's behavior** when there is no profile / intelligence is
  off / the profile is insufficient — same as the "AI failures return silently"
  rule. Everyone with a sufficient profile gets the richer chat automatically.

## Privacy, consent, ownership

- Reuses the existing `intelligence_enabled` consent toggle and the Momentum
  **trust boundary** (userId strictly server-side).
- Character is derived from the user's own data and is **owner-private**.
- Trait *scores* are factual (deterministic) and need no confirmation; trait
  *narration* is observational (like Intelligence), not an auto-applied insight;
  the *goal* the chat produces still requires the user to pick/confirm (existing
  pattern). No new auto-applied AI writes.
- **Cascade: Level 3.** Touches types (trait contract), AI output contract
  (narrator/refine), `lib/ai/*` (CEO), `features/momentum/` + `app/api/*` +
  `lib/db/*` (CTO), and `features/goals` chat client (VP Product). Coordinate.

## Phased beta plan

- **Phase 0 — spec lock.** Freeze the domain→facet→signal table, tier thresholds,
  and the trait contract type. No behavior change.
- **Phase 1 — engine (deterministic only).** `features/momentum` character
  reducer over existing events; `GET`-side `characterSummary`; unit tests mirror
  `engine.test.ts`. No LLM yet — validate the numbers read as *truthful* on real
  accounts first.
- **Phase 2 — narrator.** Add the LLM narration pass (Haiku, Intelligence voice),
  behind a `FEATURES.CHARACTER_ENABLED` flag. Still no refine.
- **Phase 3 — Character lens UI** on the Momentum surface (domains, facets,
  receipts, strengthening/resting split).
- **Phase 4 — hybrid refine.** Add the bounded ±1-tier LLM refine with stored
  reasons; measure how often it moves a tier and whether users agree.
- **Phase 5 — trait-aware goal chat.** Inject the character context block into
  the existing chat; A/B against today's chat on goal-completion follow-through.

## Risks / open questions

- **Astrology risk.** If it reads as a fixed verdict on identity, it feels like a
  horoscope. Mitigation: always evidence-linked receipts + "what your actions are
  building," never "what you are."
- **Sparse-data cold start.** New users have almost no signal. Mitigation: lean on
  `isProfileSufficient()`-style gating; show only what's earned; most facets start
  dormant, which is honest.
- **Big Five with weak social signals.** Extraversion/Agreeableness depend on
  Circles; for solo users they stay dormant. Accept this as truthful rather than
  padding scores. Open question: is a 5-domain wheel with two usually-dormant
  domains confusing, or is the honesty worth it?
- **LLM refine drift.** Even ±1 tier can erode reproducibility. Mitigation: store
  engine value + delta + reason; make refine fully disableable; log every move.
- **Voice drift** across many facet narrations. Mitigation: reuse the Intelligence
  system prompt constraints; cap length; observational only.
- **Cost.** Narrating 5 domains × up to 3 facets per user. Mitigation: batch into
  one Haiku call per refresh; rate-limit like other optional AI; cache the
  summary (SWR) like Momentum/Home.
```
