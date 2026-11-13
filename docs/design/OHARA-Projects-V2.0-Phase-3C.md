# OHARA Projects V2.0 — Phase 3C

Local implementation for review, October 22, 2026. Worktree: `/private/tmp/ohara-workspace-v2`; branch: `codex/workspace-design-system-v2-phase1`; base HEAD: `d286285dccd13cee607cd706fa56df589562e357`.

## Scope and audit

Read the Workspace V2.0 foundation, rollout and Phase 3B Goals specifications, Project routes, services/types/store, creation and management dialogs, invitations, chat/comments, task previews and canonical mutation calls, Goal associations, Source handling, Project Vault and existing security/browser fixtures. No separate saved Phase 3A audit was found. Its aggregation and lifecycle findings in the approved Phase 3C brief were treated as constraints.

Projects remain independent organizational workspaces. No Goal is required to create a Project or use its authorized Notes, Reflections, Sources and collaboration. Goals remain outcomes with one optional Project association. Vault remains the parent of Notes, Reflections and Sources; Echo remains the existing insight identity. No new library, Task system or Project score was introduced.

## Library

- List-first following user review, with grid still available. Rows retain category accents and icons, meaningful titles, Personal/Team/Guide context, status and active Goal count. Desktop additionally shows description, category and recent activity.
- Grid uses responsive fixed tracks, category accents and bounded Goal previews without aggregate Vault counts.
- Search and lifecycle filters stay visible. Category/context/Shared with me filters are in a disclosure to keep mobile browsing compact.
- Invitations have a dedicated, labeled disclosure, automatically expanded for pending invitations. Accept/decline reuse the existing RPC. Invitation failure does not suppress the Project library.
- Separate loading, request failure/retry, no Projects, no matches, no shared Projects and no pending invitations states. The Project summary read opts into throwing query errors; other `fetchProjects` consumers retain their existing contract.

## Detail information architecture

```text
Projects library (List / Grid)
└── Project identity, context, status, members, management
    ├── Overview
    │   ├── Current Goals + canonical Tasks and Milestones
    │   ├── Directly linked, authorized Entry preview → Vault
    │   ├── Collapsible Project conversation
    │   └── Published per-Goal Momentum, existing Echo insight, activity
    ├── Goals
    │   ├── Active / Completed / Historical / Paused / Expired / Archived / All
    │   └── Existing creation, linking and responsibility management
    └── Vault
        └── Existing All / Notes / Reflections / Sources workspace
```

The web layout uses the existing shell, serif heading, shared Card/Button/Typography/Badge/BrandIcon primitives, and Goal status/category/milestone presentation helpers. Desktop uses two flexible columns, not the previous crowded three-column dashboard; tablet/mobile stack. Native navigation and the native detail layout branch are retained.

Section buttons are ordinary keyboard-operable buttons with `aria-pressed`, rather than incomplete ARIA tabs. Query-string navigation uses existing `/projects/[id]` routes, and the web section is derived from the URL so browser Back/Forward cannot restore a stale locally selected section. `/goals?goal=...&projectId=...` and existing Vault deep links remain intact.

At user review, the duplicate in-page Projects back caption was removed on web. The existing top Workspace / Projects breadcrumb becomes a real library link on Project detail only; native back navigation and other shell routes are unchanged. This is the sole Phase 3C shell compatibility change.

## Collaboration and canonical operations

- Owner/admin/member/guide controls still derive from the collaboration capabilities and existing management component; no client filtering replaces RLS or server checks.
- Members, invitations, role management, Goal leads, Task/milestone assignments, entry sharing and Leave Project remain reachable.
- Add Existing Goal retains explicit confirmation before reassignment. Detach uses the existing association RPC and does not delete the Goal or its history.
- Project Task controls still mutate canonical occurrence IDs using existing idempotency keys. Quantity controls, assignee rules, comments and post-write Momentum refresh remain unchanged.
- Task/Milestone creation opens the existing per-Goal management workflow; no Goal-free Tasks are fabricated.
- At user review, creation moved from a floating button between cards into a compact “+ New” action in the Tasks card header. It still asks users to work through the existing owning-Goal controls.
- Chat is mounted on first expansion, retaining its draft when collapsed. Existing send/edit/delete and author-only controls remain, with an explicit reload action for failures.
- New Project content scrolls within a viewport-bounded dialog, keeping its confirmation controls reachable on short screens.

## Goals and Momentum

All associated Goal lifecycles can be browsed. Historical outcomes do not show an active next-milestone prompt. Existing successor links are shown when the successor is present in the authorized Project Goal dataset; the canonical Goal page still owns full successor/lifecycle handling.

Momentum reads only the existing published per-Goal projection. A missing weekly change is not converted to zero/no change. Loading and unavailable scores are distinguished. No Project metric, formula, recalculation trigger, historical snapshot or timezone was changed.

## Vault integration and Phase 3D boundary

Project Vault continues to use `ProjectVaultWorkspace`, the parent-neutral `VaultWorkspace`, `useProjectVault`, and existing Source APIs/authorization. Entry failures now use the actual `shared Entries` partial-error label; Entry/Source/activity loading, failure, retry and empty states are distinct. Failed auxiliary reads do not block the Project identity or Goals.

**Outstanding Phase 3D dependency:** Notes and Reflections linked only to a Goal may be absent unless also directly linked to its Project. This has deliberately not been rewritten. Preview/Vault copy describes the direct Entry scope and explicitly says linking is not sharing. Aggregate Vault count metrics are omitted. Canonical IDs, private content access and Sources storage are unchanged.

Phase 3D should define an authorized, deduplicated aggregation contract across direct Project links and Goal links, with private/owner/admin/member/guide/removed-member security tests before exposing comprehensive totals. Do not replace the current gap with an unscoped client union.

## Performance and reliability

The existing staged Project hydration is retained, including protection against a slow projection reverting a confirmed Task mutation. Request generations prevent an older load from replacing a newer Project state. Failed refreshes are surfaced rather than silently swallowed. Denied/missing Projects do not start the detail content pipeline.

Browser instrumentation verifies zero Project chat reads before expansion and a read after opening conversation. This is a structural reduction, not a production latency benchmark. No request cache, auth bootstrap, provider, global deduplication or generic API client was changed. Secondary Project reads still hydrate together and may repeat on route navigation; further optimization is deferred rather than introducing competing infrastructure.

## Accessibility and responsive review

- Light/dark initialization, visible theme-aware controls, text status labels independent of color, labeled search/view/section controls, keyboard activation and browser history are covered by browser checks.
- Mobile library/detail checked at 320, 390 and 768 pixels for horizontal overflow. Desktop screenshots use 1600×1100; mobile screenshots use 390×844. Browser scale is asserted as 1 (100%).
- Creation dialog scrolling fixed after a browser test exposed an unreachable footer at short viewport heights. Project assignment/comment/lead controls and chat icon targets were enlarged; the canonical Task checkbox retains its compact visual with hit slop.
- Reused legacy shared dialogs/controls are not a blanket WCAG certification. Physical touch, VoiceOver, real iOS and comprehensive contrast testing remain outstanding. Some shared compact buttons remain 42px; broad design-system changes are outside this phase.

## Files

Modified: `app/(app)/projects/index.tsx`, `app/(app)/projects/[id].tsx`; `components/layout/WorkspaceShell.web.tsx` (Project breadcrumb only); `features/projects/components/{ProjectCard,ProjectChat,ProjectVaultWorkspace,CreateProjectModal,ManageProjectModal}.tsx`; `features/projects/services/project-service.ts`; `features/projects/hooks/useProjectVault.ts` (clear a superseded read error on a fresh parent projection); `features/projects/ui.test.ts`; `tests/workspace-v2/playwright.config.ts`; rollout documentation and `CHANGELOGCODEX.md`.

Added: `features/projects/components/ProjectGoalsPanel.tsx`; `tests/workspace-v2/{project-fixtures.ts,projects.spec.ts,projects.test.ts}`; this document; `docs/ui-checkpoints/projects-v2/`.

Earlier landing/auth, Home, Goals and workspace foundation source changes are preserved, not redesigned in this phase. Existing unrelated files remain intact.

## Validation

All browser accounts/content and writes are intercepted development fixtures, not production accounts. Existing security suites are source/domain regression checks, not a new live production RLS audit.

| Check | Result |
| --- | --- |
| Full workspace/landing/auth browser regression | 35 passed, including 16 Project scenarios |
| Project model, insight, security and UI tests | 52 passed |
| Workspace foundation, Home, Goals and Project unit checks | 13 passed |
| Goals and lifecycle tests (`lib/goals` + `features/goals`) | 89 passed |
| Entry/editor/collaboration/security tests | 89 passed |
| Tasks/occurrences/activity tests | 86 passed |
| Momentum tests | 74 passed |
| Sources | 11 passed |
| Calendar | 10 passed |
| Prelaunch/navigation | 15 passed |
| Auth | 8 passed |
| Friends | 13 passed |
| TypeScript | Only the pre-existing `lib/goals/manual-create-v1.test.ts(6,41)` TS2769 URL-type diagnostic; no new errors |
| Web production export | Passed locally; `/tmp/ohara-projects-v2-web` |
| iOS JavaScript export | Passed locally; `/tmp/ohara-projects-v2-ios` |
| `git diff --check` | Passed |

Project browser scenarios cover default list/grid/category/status/context browsing, invitations and independent failures, published Momentum/null delta, lifecycle history, Vault deep links and Back/Forward, canonical Task completion, deferred chat, owner/admin/member/guide controls, comments, Goal-free creation/workspaces, explicit reassignment/detach, chat send/edit/delete, leaving, dark initial loading, denied reads and Source/Entry retry. Source failure testing caught and corrected a stale hook error after a successful parent refresh. Breadcrumb testing preserves library navigation after removing the duplicate caption.

Existing Metro require-cycle warnings remain outside this phase. No new database migration was introduced or applied; no live backend authorization tests or physical iOS tests were performed. The JavaScript export is not a device validation.

## Review and release state

See [the screenshot index](../ui-checkpoints/projects-v2/README.md). Phase 3D is not started. No schemas, production services, permissions, scoring or shared caching infrastructure were changed. Nothing committed, pushed, merged or deployed. Stop for user review.
