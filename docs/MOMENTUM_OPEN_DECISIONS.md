# Momentum Open Decisions

Status: unresolved product policy for phases after the Phase 1 foundation

Canonical reference: `OHARA_Momentum_Algorithm_and_Implementation_Specification.pdf`

Phase 1 must not silently decide the policies below. The calculation contracts and versioned configuration leave room for them without changing the storage model or rewriting the engine.

## Integrity-remediation decisions now fixed

These are engineering integrity rules, not unresolved scoring policy:

- only trusted server code may create derived scores, hashes, reasons, aggregates, or snapshot revisions;
- authenticated clients may request/read only their own calculation;
- planned-action numerator and denominator use the same normalized action-ID set;
- snapshots are immutable and corrections create superseding revisions;
- duplicate action IDs count once and the planned-action numerator cannot exceed its denominator.

Changing any of these guarantees requires a new security review, not a product-tuning decision.

## Inactivity behavior

- Should a completely inactive completed week apply proportional drag?
- The specification recommends holding Momentum stable in v1, but requires product validation before release.
- Phase 1 uses the documented v1 recommendation: no gain and no drag when no eligible events exist, with `NO_ELIGIBLE_ACTIVITY`.

## Reflection contribution limits

- Is five the final weekly limit for qualified reflections?
- What deterministic minimum content and similarity thresholds qualify a reflection?
- How are legacy Echo reflections normalized without reinterpreting private content?
- Phase 1 defines the configurable limit but does not enable reflection scoring.

## AI scoring bounds

- Which model and classification rubric may enhance reflection quality?
- What confidence threshold is required?
- What is the maximum bounded adjustment, and what deterministic fallback applies?
- Phase 1 performs no AI scoring.

## Momentum decrease rules

- Should drag apply during low-activity weeks, and at what minimum eligible-event threshold?
- Should a protected floor based on lifetime milestones exist?
- How should decreases be explained without implying erased growth?
- Phase 1 implements the formula only for weeks with eligible events and clamps at zero.

## Pillar visibility

- Which pillar scores and contribution details should users see outside internal diagnostics?
- Should unavailable pillars be shown, hidden, or explained?
- Phase 1 returns safe summary reason codes and keeps detailed diagnostics internal to the authenticated API option.

## User opt-out or hide controls

- Where should Momentum visibility be configured?
- Does hiding Momentum stop calculation, only hide presentation, or both?
- Phase 1 introduces no opt-out UI or policy.

## Privacy defaults

- Which diagnostic roles may inspect calculation snapshots?
- How long should raw input identifiers and calculation diagnostics be retained?
- Phase 1 stores no reflection text or action text in Momentum events or snapshots. Owner-scoped RLS is the default.

## Milestone weighting

- What schema field distinguishes small, medium, and major milestones?
- What are the exact weights and weekly target?
- Phase 1 leaves milestone normalization unavailable.

## Goal progress normalization

- What expected weekly pace should be used for goals with missing or changing deadlines?
- How should progress edits and backdated corrections be represented as auditable deltas?
- Phase 1 does not infer goal-progress events from mutable goal rows.

## Resilience detection

- What missed-commitment threshold constitutes a disruption?
- Which authoritative record represents a constructive plan adaptation?
- How long after disruption can a recovery action qualify?
- Phase 1 retains the configurable neutral score but marks Resilience unavailable.

## Recalculation governance

- Who may request recalculation of a published week?
- How should a superseding snapshot be surfaced to users and operations?
- Phase 1 stores immutable snapshot revisions and calculation hashes; no public recalculation control is added.

## Feature flags and rollout

- Which accounts or cohorts may see Momentum before private beta?
- What immediate rollback mechanism governs Home visibility?
- Phase 1 wires the existing Home preview without adding cohort or general-availability controls.

## Historical goal-status eligibility

- Phase 1 uses the action's current related goal status and treats `active`, `complete`, and `stagnant` as scoreable while excluding draft/discovered/archived states.
- Should eligibility instead use the goal status captured at the action's occurrence time?
- What authoritative event should preserve historical status when a goal is later archived or reopened?
- No historical status is invented from mutable goal rows in Phase 1.

## Action deletion, archival, and recurrence

- The current `action_logs` schema has no soft-delete or archived timestamp. Should a later deleted action cause a superseding historical calculation, or remain as immutable historical evidence?
- If recurring actions gain multiple occurrences, what canonical occurrence ID guarantees each occurrence counts once without treating one action row as repeatable?
- Phase 1 counts each authoritative action ID at most once and does not infer deleted or recurring occurrences.

## Calculation trigger ownership

- The current Home read lazily publishes the most recently completed week idempotently.
- Which scheduler, queue, or operational job owns routine calculation before shared rollout?
- Who may trigger late-event recalculation and what rate/age limits apply?
