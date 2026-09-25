# Projects V1.1 Collaboration and Contextual Intelligence

## Collaboration architecture

Projects use one membership and capability system for Personal, Team, and OHARA Guide modes. `projects.user_id` remains the single canonical owner. Accepted members live in `project_members`; pending relationships live in `project_invitations` until acceptance. The launch participant limit is three people total, including the owner, and is enforced by the UI, trusted RPCs, a serialized advisory-lock acceptance path, and a database trigger.

Role names are presets, not authorization checks. Application surfaces consume the capability list returned by `get_project_collaboration_v11`.

| Capability area | Owner | Admin | Member | Guide |
| --- | --- | --- | --- | --- |
| View Project/shared Vault | Yes | Yes | Yes | Yes |
| Manage Project/members | Yes | Yes | No | No |
| Invite members | Yes | Yes | No | No |
| Assign Goal lead | Yes | Yes | No | No |
| Create/assign/complete Tasks | Yes | Yes | Complete | Yes |
| Create/assign Milestones | Yes | Yes | No | Yes |
| Add shared content/comment | Yes | Yes | Yes | Yes |
| Archive/destructive owner actions | Yes | No | No | No |

Admin and Guide do not receive canonical Goal creation or Goal editing capabilities in V1.1. Goals remain personally owned, and the existing Goal creation/update paths require that owner. This avoids weakening Goal ownership or creating an unsafe second write path.

## Ownership transfer boundary

Project ownership transfer is deliberately deferred. A Project can contain canonical Goals and private owner content that cannot be atomically transferred under the current same-owner Goal constraints. The UI explains this boundary and no operation transfers Goals, private Entries, Sticky Notes, or unrelated account data implicitly. A future transfer design must make each retained, detached, or separately transferred object explicit.

## Privacy model

Membership never exposes private content automatically. Echo Notes and Reflections use explicit `private`, `project`, or `guide` sharing scope. Existing Goal Sticky Notes remain owner-private. Shared Vault queries authorize before returning titles, previews, counts, backlinks, activity, or Intelligence facts. Team and Guide Intelligence receives only already-authorized structured aggregates and never Note/Reflection text.

## Contextual OHARA Intelligence

The deterministic system has three separate stages:

1. canonical authorized data produces structured facts;
2. the screen context filters and ranks those facts;
3. context-specific templates present one primary and at most one supporting insight.

Supported contexts are Home, Goal, Personal Project, Team Project, Guide Project, Momentum Weekly, Momentum Monthly, and Weekly Recap. Projects, the existing Goal Intelligence card, and Momentum consume the shared engine in V1.1. Home and Weekly Recap have selectors and presentation contracts ready for later UI work.

Facts contain a type, subject identity, time window, current/previous values, delta, metadata, priority hint, and authorization state. They do not contain final prose. The same `goal_momentum_change` fact therefore produces Goal-specific, Project-comparative, Momentum-explanatory, or Weekly Recap wording without duplicating analysis.

The engine is non-LLM and does not alter Momentum V1.1 inputs, weights, formulas, snapshots, or publication paths.

## Migration and rollout

Pending production migration: `072_projects_v1_1_collaboration.sql`.

Deployment order after explicit approval:

1. verify production remains at Migration 071 and take the normal database backup;
2. apply Migration 072;
3. verify tables, triggers, functions, grants, RLS policies, and the three-member concurrency guard;
4. deploy the reviewed application commit;
5. run owner/Admin/Member/Guide authenticated smoke checks and private-content denial checks.

No new environment variables are required.

Rollback should disable or revert the application surface first. Migration 072 is additive, but its new collaboration records and assignment metadata should be preserved. Do not drop its tables or columns as an emergency rollback. If application rollback is required, leave 072 applied and return to the previous reader until a reviewed forward migration is available.
