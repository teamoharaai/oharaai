# OHARA Vault V2.0 — Phase 3D

Local worktree `/private/tmp/ohara-workspace-v2`. No release authorized.

## Pre-implementation audit (October 22, 2026)

Read Phase 3C's implementation report and the Phase 3D brief's Phase 3A findings. No separate persisted Phase 3A report exists in this worktree. Earlier local work remains intact.

### Current query and relationship map

- Web sidebar: Notes and Reflections under Echo; Sources under Vaults. URLs are `/notes`, `/journal`, and `/notes?view=sources`. Native navigation is separate.
- Goal detail: on opening Vault, the web page loads the full Entry library then filters Goal links client-side. Parent-neutral `VaultWorkspace` renders canonical Entries separately from Sources. Its retry fallback repeats this library read.
- Project: `fetchProjectWorkspace` first resolves an RLS-authorized Project and Goals, then loads direct `entries.project_id` metadata. Goal-only Entries are absent. Entry-link activity is separately bounded to 30 rows and is NOT a complete aggregation source.
- Project Sources: authenticated `/api/projects/:id/vault` resolves Project, visible Goals, their Vaults and `vault_items`; deduplicates Source IDs and attaches authorized Goal titles. Goal Sources use `/api/vaults/:goalId`. Source files use private storage and authorized access URLs.
- Canonical Entry associations: optional direct `entries.project_id` plus many-to-many `entry_goal_links`. Goals have one optional Project. Sources retain one owning `vault_id`, never Entry copies or multi-parent associations.
- Duplicate cases: one Entry linked to several Project Goals; direct Project plus Goal links; repeated join rows. Deduplicate by canonical Entry type/ID; Source IDs occupy a separate domain.
- Legacy `/goals/:id/vault` is still used by Roots; retain the URL and native screen while routing web access to the canonical contextual Vault.

### Authorization and mutation boundaries

- Every query uses the viewer's authenticated client and database RLS, not a service-role client. Migration 036 grants owners their own Entry reads/writes. Migration 073 allows explicitly Project/Guide-shared Entry reads to the corresponding members; a Goal link alone does not grant Entry access. Shared Entry Goal links are separately RLS-filtered. Removed members lose shared access, not ownership of their own Entries.
- Goal metadata must come from authorized current Goal rows, never from untrusted associations alone. Detached/deleted Goals must disappear from the Project-derived scope.
- Sources use existing Vault/item RLS and storage policies (073/091); private stays private, shared visibility follows current membership, writes require creator/owner/capability rules. UI controls are not the authorization boundary.
- Existing Entry editors save relationships with the canonical version-checked `save_entry_v4` path. There is no safe relationship-only append API to reuse without loading and saving the current document; Phase 3D will direct linking through existing editors, not introduce a competing writer. Sharing is a separate explicit operation.

### Implementation decisions

Unify the web navigation under Vault, preserving all routes. Do not add a global All page: existing libraries have different pagination, folders and authorization projections; a new complete aggregate contract is outside this phase. All remains available in contextual Vaults. Do not expose an aggregate count: existing `vaultItemCount` counts Sources only and Source/API paging is not a complete cross-domain total. Keep published Goal Momentum separate from Project identity.

Implement scoped, paged Entry metadata reads for contextual Vaults, preserving successful paths on partial failure. Query authorized Goals/links and then independently RLS-authorized Entries; never infer permissions from the IDs. Preserve Source ownership/storage and all mutation semantics. Validation results and final file inventory will be recorded below after implementation.

## Implemented navigation and contextual experience

Global web sidebar: Workspace / **Vault → Notes, Reflections, Sources** / Perspective. Three shallow Vault destinations remain visible in the expanded sidebar and mobile drawer. The existing collapsed rail retains accessible names, tooltips and active child indicators. No empty Echo destination was added; Echo remains the insight identity. Existing `/notes`, `/journal`, `/notes?view=sources` and editor URLs are unchanged. Global All is intentionally omitted, not replaced by a competing library.

Goals retain Overview / Tasks / Milestones / Vault; Projects retain Overview / Goals / Vault. Contextual Vault uses All / Notes / Reflections / Sources. The redundant Project Vault heading is removed; the canonical Vault header owns Add to Vault on web. Native navigation remains separate. Roots/bookmarked `/goals/:id/vault` URLs redirect only on web to `/goals?goal=:id&view=vault`.

## Aggregation and privacy

`readContextVaultEntries` verifies an authorized parent, then independently reads direct Project Entries and current authorized Goal/link/Entry metadata. Reads are paged in batches of 200 with stable ordering, and ID lists are chunked. No full document, conversation-turn or account-library hydration is needed. Plain-text previews are bounded for presentation. Editor navigation always resolves full canonical detail/capabilities afresh; the metadata projection must not be used as an editing document.

The union deduplicates by Entry type and ID. Multi-Goal and direct-plus-Goal Entries appear once. Origins use only current, authorized Goal metadata, showing up to two names and an additional-origin count. Other Project names are not hydrated from indirect associations. Deleted/detached Goals leave the current Project scope. Goal-free Projects still show their direct content. This is read-only aggregation: no copied Entry records, no visibility changes, no Source reparenting.

Existing Project/Goal Source APIs and their storage/RLS policies are untouched. Project Sources retain their existing direct/Goal aggregation and single-parent ownership. No aggregate count is exposed: Source queries retain their existing pagination limits, and a failed/incomplete scope is never counted as zero or presented as a comprehensive total. Filter labels do not fabricate counts.

**Discovered contract limit:** the database trigger `validate_goal_project_owner_v1` rejects Goals belonging to different owners inside one Project. The new security test explicitly verifies that rejection. The requested multi-owner scenario cannot be implemented under the existing contract; that portion is stopped pending separate architecture approval. No trigger, policy or schema was weakened.

## Create, link and share

Create New retains existing Goal/Project context preselection for Notes, Reflections and Sources. Link Existing is clearly distinguished and guides users into the existing Notes/Reflections libraries and editor link controls. It is not a new inline association picker or a replacement save API. Existing version-checked editor saves remain authoritative. Sharing stays an explicit, separate owner operation; linking does not grant access. Sources are not offered unsupported multi-parent linking. Legacy mirrored Reflections continue opening canonical detail routes and existing authorized legacy handling.

## Loading, errors and efficiency

- Direct and Goal-linked Entry reads settle independently: a failed path preserves the successful path and displays an incomplete-content message with retry, never a false empty state.
- Entry failure does not hide available Sources, and Source failure does not hide Entries.
- Goal Vault no longer fetches the complete Entry library. Project Vault no longer repeats its parent's Source request on mount.
- Goal/Project Source hooks and contextual Entry retries guard against superseded read responses; Project parent load generations remain intact.
- Parent/route changes clear stale retry projections. Successful parent refresh clears superseded hook errors.
- No auth caching, global providers, Friends/Circles services, generic request deduplication or `lib/api/client` changes were made in Phase 3D.

## Approved polish and accessibility

Zero-invitation Project disclosures are compact, transparent and still reachable; pending/error invitations keep their prominent treatment. Momentum copy now says “Momentum for each active Goal,” with no aggregate score. Echo inactivity copy states when the latest visible/recorded activity occurred; deterministic fact selection and scoring are unchanged.

Reused workspace tokens provide light/dark surfaces and tested AA core text/selected-state contrast. Contextual filters are keyboard-operable buttons with selected/pressed states; existing focus outlines and mobile drawer focus handling remain. Content-area dimensions determine Vault wrapping. Browser checks cover 320/390/768/1024-pixel widths, expanded/collapsed desktop, long titles, dark initial state, keyboard filters and deep links. This is not a blanket WCAG certification or physical-device assessment.

## Validation results

All browser content/accounts/writes are intercepted synthetic fixtures. Database suites build disposable local PostgreSQL clusters from the real migration chain; they do not contact production.

| Check | Result |
| --- | --- |
| Full workspace + landing/auth browser regression | 38 passed, including 3 new Vault scenarios |
| Entry, Project, insight, Source, Goal/lifecycle and workspace unit/source tests | 262 passed, including 5 executable aggregation tests |
| Full migration chain and database/security suites | All 17 passed, including new Vault-context RLS/mutation suite |
| Tasks/occurrences/activity | 86 passed |
| Momentum | 74 passed |
| Prelaunch/navigation | 15 passed |
| Auth | 8 passed |
| TypeScript | Only pre-existing `lib/goals/manual-create-v1.test.ts(6,41)` TS2769 URL-type diagnostic |
| Web production export | Passed: `/tmp/ohara-vault-v2-web` |
| iOS JavaScript export | Passed: `/tmp/ohara-vault-v2-ios` — not physical iOS validation |
| `git diff --check` | Passed |

New SQL tests exercise personal/team owner, admin, member, guide, removed member, private Note under a shared Goal, multi-Goal/direct-plus-Goal Reflection deduplication, Goal and Project Sources, author-only mutations, detached/deleted associations and Goal-free Projects. Multi-owner Goals are tested as rejected under the existing data contract. Existing full-chain suites additionally cover Source storage, creator/role enforcement, removal, sharing and historical Entry behavior. Unit tests exercise scoped query construction, pagination, deduplication, denied-parent short-circuiting and meaningful partial results; they do not pretend their mocked rows validate RLS.

The first browser run exposed incomplete *test fixtures* for Sources/Reflections library navigation, corrected to the real response shapes; all 38 subsequently passed. Local DB fixture creation was aligned with the existing Goal-owner and Vault-type constraints rather than altering production semantics. Existing Metro require-cycle and local `xcrun simctl` warnings remain. No physical iOS or production smoke tests were performed.

See [all ten 100%-zoom screenshots](../ui-checkpoints/vault-v2/README.md). Desktop All/Sources, dark Project Vault, Goal All and mobile navigation were visually inspected. Test logs are `/tmp/ohara-3d-*.log` (ephemeral local artifacts).

## Phase 3D file inventory

Added:

- `features/entries/services/context-vault.ts`, `features/entries/context-vault.test.ts`
- `app/(app)/goals/[id]/vault.web.tsx`
- `scripts/vault-context-security.test.sql`, `scripts/db-chain/suites/vault-context.sh`
- `tests/workspace-v2/vault.spec.ts`
- This design report; `docs/ui-checkpoints/vault-v2/README.md` and ten PNGs

Modified:

- `components/layout/workspace-navigation.ts`, `components/layout/WorkspaceShell.web.tsx`
- `features/goals/components/GoalVault.tsx`, `features/goals/components/GoalsExperience.web.tsx`, `features/goals/hooks/useVault.ts`
- `features/projects/services/project-service.ts`, `features/projects/components/ProjectVaultWorkspace.tsx`, `features/projects/hooks/useProjectVault.ts`
- `app/(app)/projects/index.tsx`, `app/(app)/projects/[id].tsx`
- `features/intelligence/contextual-insights.ts`, `features/projects/intelligence.test.ts`
- `scripts/db-chain/run.sh` (register isolated test suite only)
- `tests/workspace-v2/{goals.spec.ts,goals.test.ts,projects.spec.ts,playwright.config.ts}`
- `docs/design/OHARA-Workspace-V2.0-Rollout.md`, `CHANGELOGCODEX.md`

Existing synthetic checkpoint PNGs were refreshed by the regression suite; earlier phases' source work remains preserved. No migration files or production settings changed.

## Review state and Phase 3E recommendations

Phase 3D is implemented locally within existing contracts and ready for review. Native device/VoiceOver QA, broader accessibility certification, a potential relationship-only linking API/picker, complete paginated Source aggregation/global All, and any multi-owner Goal/Project model change require separate scope/approval. Do not infer these future features from the current UI.

Branch remains `codex/workspace-design-system-v2-phase1`; HEAD remains `d286285dccd13cee607cd706fa56df589562e357`. No staged changes or tracked deletions. Nothing committed, pushed, merged or deployed. No production database or service changes. Stop here for review.
