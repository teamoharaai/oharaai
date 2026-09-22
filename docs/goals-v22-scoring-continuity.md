# Goals V2.2: product category and Momentum compatibility

Product category is organizational context. Its exact stored/display values are
Health & Fitness, Work & Money, Learning & Creativity, and Life & Relationships.
It is not a Momentum scoring input for an established Goal.

## Durable scoring identity

The schema audit found no existing immutable Goal-level baseline. The existing
`goal_difficulty_profiles` table stores revision-specific calculated profiles,
not an authoritative baseline for every Goal. Migration 067 therefore adds
`goals.momentum_scoring_profile`, backfilled from the pre-migration adapter before
068 changes any product category. Unknown values abort rather than silently fall
back. The ten individually approved `mind` Goals retain Education regardless of
their approved product category.

New Goal defaults reuse existing V1.1 profiles:

| Product category | Scoring profile |
| --- | --- |
| Health & Fitness | health_fitness |
| Work & Money | finance |
| Learning & Creativity | creative |
| Life & Relationships | relationships |

The database rejects edits to the established profile, ignores client-selected
calibration on creation, and inherits the same-owner predecessor profile for New
Phase. Category editing changes organization only. Goal-level rhythm remains a
separate, unchanged difficulty input. There is no recalibration UI.

## Read and history boundaries

Momentum reads the durable profile for event normalization, difficulty, and plan
revision identity. Canonical product categories without a persisted profile fail
closed. A legacy-only fallback supports historical fixtures; it must not become
a fallback from the four new categories for existing Goals.

Neither migration rewrites Momentum snapshots, closed weeks, difficulty history,
or formula/weight/version constants. Momentum remains V1.1. Product category
consolidation archives original Entry category-link rows owner-privately before
deduplication, and rederives inherited context from linked Goals. It does not
delete/archive Goals, historical Circles posts, or user-authored content.

## Validation

Release order is expand/deploy/convert: apply 067 first while legacy categories
remain unchanged, deploy and verify the profile-aware application, then apply
068–069 before production acceptance. Applying 068 under the old application
would reinterpret canonical categories through its legacy scoring fallback.
Goal and linked-Entry reads therefore support approved legacy values during the
transition; new writes require canonical values. Manual creation may be briefly
unavailable until 068 completes. Never deploy profile-column reads before 067.

`scoring-profile.test.ts` covers approved mappings/defaults and fail-closed reads.
`engine.test.ts` compares full difficulty and score outputs before/after taxonomy
changes for historical profiles and every approved mind Goal. The isolated SQL
profile test covers creation, edit rejection and inheritance. The full-schema
data-bearing upgrade test compares Goal history, closed-week snapshots and
difficulty rows before/after. Lifecycle SQL exercises the actual New Phase RPC.

Upstream migrations 063–066 (Task optimizations and private Sticky Note folders)
take precedence. V2.2 migrations are 067–069 and must be validated against the
current production ledger before release. No migration has been applied to
production by this document.
