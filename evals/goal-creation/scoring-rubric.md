# Goal Creation Eval Rubric

This harness evaluates the existing goal-creation API flow against a fixed fixture set and uses lightweight, transparent heuristics rather than judge-model scoring.

## Core principles

- Score the real `/api/goals/create` conversation flow, not a mocked abstraction.
- Prefer simple text-pattern and payload heuristics that are easy to inspect in output JSON.
- Keep all behavior scoring fixture-driven through optional `expected.*` fields.
- Surface heuristic flags per case so false positives are debuggable.

## Metrics

### Time to first structured draft

- Measured in milliseconds from the first user request until the first assistant message that looks like a concrete draft.
- Draft detection is heuristic: the response should contain at least three draft-style signals such as a draft title, summary, why this matters, assumed timeline, first milestones, or assumptions.
- Score:
  - `5`: first assistant turn is structured
  - `3`: structured by the second assistant turn
  - `1`: only appears after repeated back-and-forth
  - `0`: never produces a structured draft before finalization

### Number of clarification questions

- Counted from assistant draft-stage messages only.
- The harness counts question-like lines, then compares against the fixture's `maxClarificationQuestions`.
- Score:
  - `5`: at or under the target cap
  - `3`: exceeds the cap by 1
  - `1`: exceeds the cap by 2 or more

### Assumption quality

- Uses `goalData.assumptions` first, then falls back to the internal `reasoning` field if assumptions are absent.
- Rewards explicit, plausible assumptions that match fixture expectations.
- Penalizes missing assumptions when the case is underspecified, or assumptions that contradict fixture intent.
- Score:
  - `5`: explicit and relevant assumptions, strong keyword overlap, no obvious bad assumptions
  - `3`: some useful assumptions, but incomplete or vague
  - `1`: assumptions are absent, generic, or visibly off-base

### SMART structure quality

- Checks the final structured payload.
- Rewards:
  - all five SMART fields present and non-trivial
  - description/title within schema limits
  - deadline behavior matches the case
  - 1-4 measurables with valid shape
- Score:
  - `5`: clean, complete, specific structure
  - `3`: valid but thin or partially generic
  - `1`: weak structure or validation issues
  - `0`: no final structured payload

### Realism quality

- Checks whether the final goal feels achievable given the fixture.
- Rewards bounded ambition, plausible timelines, and measurable targets that do not overshoot case constraints.
- Penalizes impossible deadlines, inflated targets, or homework-like measurable sets.
- Score:
  - `5`: realistic target, plausible timeline, sensible measurables
  - `3`: mostly realistic with one weak spot
  - `1`: multiple realism concerns
  - `0`: clearly unrealistic or unusable

### Should-finalize correctness

- Controlled by optional fixture field `expected.shouldFinalize` and defaults to `true`.
- This measures whether the assistant's own auto-finalization behavior was directionally correct, not whether the harness eventually forced a finalization call.
- Operationalization:
  - uses `finalizedBy`
  - uses false-finalization guardrails already in the harness
- Score:
  - `5`: assistant auto-finalized when it should have, without tripping false-finalization checks, or stayed in draft mode when the fixture said not to finalize
  - `3`: fixture expected finalization, but assistant never auto-finalized and the harness had to force finalization
  - `1`: assistant auto-finalized when the fixture said it should not, or auto-finalized too early

### Scope reduction detection

- Controlled by optional fixture field `expected.shouldOfferScopeReduction`.
- Used for oversized, blocked, contradictory, or otherwise unrealistic user requests where the assistant should narrow the first goal instead of mirroring the raw ambition.
- Heuristics check for:
  - draft-stage phrases like `start smaller`, `focus on ... first`, `phase one`, `for now`, `reduce scope`, `first step`
  - final payload language like `foundation`, `prepare`, `routine`, `baseline`, `phase 1`
- If `expected.shouldPreserveAmbition` is also true, the score additionally looks for language that keeps the bigger vision alive, such as `long-term`, `someday`, `stepping stone`, or `toward that bigger goal`.
- Score:
  - `5`: expected scope reduction was clearly detected; if ambition preservation was expected, that signal also appeared
  - `4`: scope reduction detected mainly in payload wording rather than draft copy
  - `3`: partial evidence only, or scope reduction appeared without explicit ambition preservation where that was expected
  - `1`: fixture expected scope reduction but no heuristic signal appeared
  - `5` for non-target cases with no reduction signal; `3` for non-target cases with unnecessary reduction language

### Multi-goal splitting detection

- Controlled by optional fixture field `expected.shouldSplitGoal`.
- Used when the input bundles several goals together and the assistant should explicitly choose one primary goal or separate them into later tracks.
- Heuristics check for phrases like:
  - `one goal`
  - `pick one`
  - `separate ... later`
  - `split goals`
  - `focus on ... first`
- Payload keyword carry-through is used only as weak backup evidence.
- Score:
  - `5`: expected split signal is explicit
  - `3`: no explicit split language, but the final payload strongly narrows to the fixture's intended sub-goal
  - `1`: expected split behavior is absent
  - `5` for non-target cases with no split signal; `3` for non-target cases with unnecessary split framing

### Emotional acknowledgment signal

- Controlled by optional fixture field `expected.shouldAcknowledgeEmotion`.
- Used for inputs where the user is visibly overwhelmed, stuck, lonely, burnt out, or emotionally loaded.
- Heuristics check for validation language such as:
  - `that sounds hard`
  - `it makes sense`
  - `I can see why`
  - direct acknowledgment of `stuck`, `overwhelmed`, `burnt out`, or similar language
- Score:
  - `5`: expected acknowledgment appears in the first assistant turn
  - `3`: expected acknowledgment appears later, but not immediately
  - `1`: expected acknowledgment is absent
  - `5` for non-target cases with no acknowledgment requirement; `4` for non-target cases with incidental empathy

### False finalization rate

- A case counts as a false finalization when the assistant auto-finalizes before the fixture's minimum conversation threshold.
- Specifically flagged when `finalizedBy === "assistant"` before:
  - `minAssistantTurnsBeforeAutoFinalize`, or
  - `requiredFollowUpsBeforeAutoFinalize`
- Aggregate rate = false finalizations / total completed cases.

### Save success/failure

- Default harness mode is `preflight`, not a live DB write.
- A case is a save success when the final payload passes:
  - goal-finalization schema checks used by the harness
  - persistence preflight checks mirroring current save gates
- This keeps the eval runnable without requiring a real signed-in user session.

## Fixture conventions

Each case includes:

- `initialInput`: first user message
- `followUps`: deterministic replies if the assistant asks follow-up questions
- `expected.category`: target category
- `expected.assumptionKeywords`: phrases a good draft/finalization should likely preserve
- `expected.deadline.kind`: `bounded` or `open`
- `expected.measurables.min/max`: acceptable measurable count
- `expected.minAssistantTurnsBeforeAutoFinalize`: minimum assistant draft turns before auto-finalization is considered safe
- `expected.requiredFollowUpsBeforeAutoFinalize`: minimum number of scripted follow-ups that should be consumed before auto-finalization

Optional behavior fields:

- `expected.shouldFinalize`: defaults to `true`
- `expected.shouldOfferScopeReduction`: defaults to `false`
- `expected.shouldSplitGoal`: defaults to `false`
- `expected.shouldAcknowledgeEmotion`: defaults to `false`
- `expected.shouldPreserveAmbition`: defaults to `false`

## Output expectations

Per-case JSON should expose:

- `metricScores` for both legacy and new metrics
- `heuristicFlags` showing the exact booleans and matched pattern labels used by the scorer
- `falseFinalization` and `savePreflight` status

Aggregate JSON should expose:

- `averageScores` across all completed cases
- `behaviorRates` for targeted hit-rates such as scope reduction, splitting, emotional acknowledgment, and ambition preservation
- `falseFinalizationRate`
- `saveSuccessRate`

## Suggested storage

- Fixtures: `evals/goal-creation/fixtures/cases.json`
- Rubric: `evals/goal-creation/scoring-rubric.md`
- Runner: `evals/goal-creation/run.mjs`
- Results: `evals/goal-creation/results/*.json`
