# Document 4 of 5 — Reflection Prompt / Echo Linking at Extension

**Depends on:** Document 2 (extend flow must exist to hook into).
**Codex model/effort: Terra, medium effort — flag for possible bump to
Sol.** If the audit finds Echo's composer can already be triggered/
pre-linked programmatically, this is straightforward wiring (Terra,
medium). If not — if the composer only supports manual in-app linking
after the fact — this becomes real new integration work and should move
to Sol. Don't finalize the model choice until the audit answers check #2
below.

---

## Context (for a conversation with no prior history)

Ohara supports goal "rollover" (Documents 1–2). When a user extends a
goal, the design calls for prompting a written reflection — this is the
user-facing, emotionally engaging surface of rollover (as opposed to the
computed `prior_phase_summary`, which is captured but not the star of
the UI). This document covers wiring that reflection into Echo, Ohara's
existing journaling feature — not building a new journaling UI.

## Locked decisions relevant to this phase

- Narrative is what's shown/emphasized to the user — reuse Echo's
  existing entry-creation flow as-is. No new text field, no new
  journaling paradigm.
- The created entry links to the **new** goal (not the old one) via
  `echo_entry_links` — reasoning: users will be looking at their active,
  current-phase goal when they want context on "what got me here," not
  the expired old one.
- This step must be skippable. Extending a goal has to succeed and be
  fully usable even if the user declines/backs out of the reflection
  prompt — reflection is additive, not a blocking requirement.

## Explicitly out of scope for this phase

Any change to Echo's composer UI itself. Any change to
`echo_entry_links` schema (it already supports linking an entry to a
goal). Any AI-generated reflection content — this is purely
user-written.

## Audit to run first (paste into a fresh conversation, CC/Sonnet)

```markdown
# Audit: Echo Entry Creation Flow — Extension-Linking Context

**Concern (single):** Determine how to trigger Echo entry creation,
pre-linked to a goal, from the extend-goal flow. Read-only. No
implementation.

## Checks
1. Report the current Echo entry creation flow end-to-end (composer
   component, route, how `echo_entry_links` gets written today when a
   user links an entry to a goal manually) — file paths and exact
   sequence.
2. Report whether entry creation can be triggered/pre-filled
   programmatically (e.g. navigating to the composer with a pre-set
   `goalId` param) or whether it's currently only reachable via manual
   in-composer linking after the fact.
3. Report whether any "prompt" UI pattern already exists elsewhere in the
   app (a modal/sheet nudging the user toward an action) that this should
   match stylistically, or confirm none exists.
4. Fact-finding only — no implementation, no UX design.

## Output
Output the full findings directly in this response. Do not create, write
to, or attempt to `mkdir` any file.
```

## Codex prompt (fill in [TBD] markers from the audit above before sending — this skeleton is more provisional than the others, since the shape depends heavily on audit findings)

```markdown
# Implement: Reflection Prompt at Goal Extension

**Concern (single):** After a goal is successfully extended, prompt the
user to write a reflection entry, pre-linked to the new goal. Locked
decision: reuse Echo's existing composer, no new text field, no new UI
paradigm.

## Locked contract
- On successful extend, [exact trigger mechanism — TBD per audit check
  #2 — likely navigate to Echo composer with the new goal pre-linked, or
  present a lightweight prompt/sheet if audit surfaces a "confirm before
  navigating" pattern already used elsewhere].
- The created entry links to the NEW goal via `echo_entry_links`, using
  the exact existing write path found in audit check #1 — no new linking
  mechanism.
- This step is skippable — extending the goal must succeed and be fully
  usable even if the user declines/backs out of the reflection prompt.

## Explicitly out of scope
Any change to Echo's composer UI itself, any change to
`echo_entry_links` schema, any AI-generated reflection content.

## Verification
`tsc --noEmit`. Live smoke test: extend a goal, confirm the reflection
prompt/navigation appears, write an entry, confirm it's linked to the new
goal via `echo_entry_links` and visible from the new goal's Echo Trail.
Confirm declining the prompt doesn't block or break the extend flow.

## Output
Report the exact list of files modified.
```