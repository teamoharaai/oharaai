# OHARA Workspace V2.0 rollout

## Integration review status — October 26, 2026

The separately authorized integration phases 4A–4D are not the future Echo design phase numbered 4 below. See `OHARA-Workspace-V2.0-Integration-Review.md` and its exact inventory appendix. The authoritative candidate is the verified Phase 4C rehearsal on team main `b939327dfd70f44c650992e3c0337c8798a297d8`; the incomplete original temporary directory is not a release source. Phase 4D reran 78 browser checks, 595 unit/domain checks, both 17-suite database ACL modes, TypeScript and web/iOS JS exports successfully. The security audit remains blocked (seven high package entries), and the proposed CI requires an expression-context correction and replacement of its retiring macOS 14 runner. These were reported, not patched or published. Manual/native/Safari/accessibility and real nonproduction authorization/storage checks remain pending. No integration, PR or deployment is authorized by completing this review; no Echo AI work begins.

## Phase 1 — local foundation (approval required)

Review the isolated web shell, light/dark tokens, hybrid typography, desktop rail, mobile drawer, and existing-page compatibility. Preserve the approved landing/auth baseline. No release authorization is implied by this phase.

Before any release: review pending landing/auth changes separately, reconcile upstream without losing work, rerun regression checks and production builds, validate native on a device, and explicitly authorize commit/push/deployment. No migrations are required.

## Phase 2 — Home first

Implemented locally for review on 2026-10-19. See `OHARA-Home-V2.0-Phase-2.md` for file inventory, real-data mapping, validation, screenshots and remaining limitations. Home now has a dated personalized greeting, aligned desktop cards, focus-first mobile ordering, a published Momentum history preview, clear loading/error/empty states and existing Notes/Journal entry points. Momentum/Next Step/Calendar responsibilities remain separate; no analytics or progress data is fabricated.

Dependency for advancing: review and approve Phase 2 Home. No commit/push/deployment or Goals/Projects redesign is authorized by completing this phase.

## Phase 3 — Goals and Projects

Phase 3B Goals is implemented locally for review (October 21, 2026). See `OHARA-Goals-V2.0-Phase-3B.md` for the library/detail split, preserved domain boundaries, validation and screenshots. The final review removes the standalone Goal Progress card and duplicate header Vault action. Reflections is now the approved visible terminology; technical Journal URLs remain unchanged.

Phase 3C Projects is implemented locally for review (October 22, 2026). See `OHARA-Projects-V2.0-Phase-3C.md` for the list-first library, retained grid/category coding, Overview/Goals/Vault structure, preserved collaboration and canonical operations, validation and screenshots. Its deferred aggregation work is addressed by the separately authorized Phase 3D below. No release is authorized by completing Phase 3C.

### Phase 3D — unified Vault integration (local review)

See `OHARA-Vault-V2.0-Phase-3D.md`. Web navigation now groups Notes, Reflections and Sources under Vault. Contextual All/Notes/Reflections/Sources use scoped, viewer-RLS Entry reads, including unique Project Goal-linked content; Source ownership and sharing rules remain unchanged. No new global All library or aggregate totals were invented. Roots web deep links reach the canonical Goal Vault; native navigation is retained. The database still rejects cross-owner Goal/Project associations; broadening that model requires separate approval. Phase 3E was subsequently authorized and completed locally as described below; release remains unapproved.

### Phase 3E — cross-feature hardening (local only)

See `OHARA-Workspace-V2.0-Phase-3E-Readiness.md` for preservation/checkpoint details, targeted race/error/focus/text-scaling corrections, exact test results, accessibility gaps, iOS checklist and integration sequence. All 50 combined browser tests, 273 domain/workspace tests, the additional Task/Momentum/Calendar/Auth/Friends/Circles/prelaunch/Echo suites, all 17 database suites, TypeScript and web/iOS JS exports pass. Roots has 73 passes and one existing missing-reference-image test failure; this is not silently waived. Physical iOS and broader assistive-technology testing remain incomplete. No commit, push, merge or deployment occurred. Next is explicit review and integration/device QA authorization, not an automatic next redesign or release.

Refine shared page headers, internal tabs, library/list density, task/milestone controls, and contextual side panels. Keep category coding, ownership/permissions, task scheduling, Goal lifecycle, project associations, and Vault links unchanged. Test expanded/collapsed sidebar at threshold widths before finalizing any three-column design.

## Phase 4 — Echo / Notes / Reflections

Prerequisite: Phase 3F automated resolution is complete locally. See `OHARA-Workspace-V2.0-Final-Readiness.md` and the complete change inventory before integration. Roots archival-reference checks now use the immutable original Git history without restoring archived binaries or weakening assertions; the broader acceptance suite uses already-shipped Roots heading labels. All automated gates must be rerun after upstream reconciliation. Physical iOS, Safari, accessibility acceptance and explicit release authorization remain outstanding. Phase 3F does not authorize starting Phase 4, Echo AI integration, commits or deployment.

Polish document navigation and writing canvas with optional contextual panels using shell dimensions; retain existing editor, autosave/conflict handling, shared-entry authorization, Note/Reflection storage, and closed-by-default Intelligence behavior. Confirm product nomenclature before any route/feature renaming. No editor rewrite, CRDT, or new AI functionality is included.

## Phase 5 — Momentum

Apply chart conventions and analytics layout refinement only after data/state regression coverage is stable. Preserve V1.1 formulas, snapshots, immutable historical weeks, New York week boundaries, and read/recalculation separation. Add keyboard chart exploration only as separately approved interaction work.

## Phase 6 — Sources / contextual Vaults and remaining utilities

Standardize Source lists, filters, pickers, previews, dialogs, settings, Calendar, Circles, and Roots as approved. Do not create a new Vaults backend or duplicate the federated Sources library. Respect iOS picker/EventKit handoff work and avoid exposing unavailable features.

## Cross-cutting acceptance gate for each phase

- No loss of existing functionality, routes, privacy boundaries, or data.
- Desktop expanded/collapsed, tablet overlay, mobile web; light/dark and reduced motion.
- Realistic empty/populated/error/loading/long-content states, keyboard navigation, labels and contrast.
- Existing landing/auth regressions remain green.
- Typecheck has no new tracked errors; relevant tests/builds pass; log known pre-existing limitations honestly.
- Screenshot review and explicit approval before the next page phase or release.

## Coordination

Phase 1 changes `store/uiStore.ts` only to read a scoped appearance context. It does not change persistence schema, theme toggle logic, session reuse, or request caches. Root auth/bootstrap and `lib/api/client` remain untouched. Circles and full Calendar page changes only switch responsive width reads to the usable workspace dimensions. Home's calendar preview additionally has the user-requested card-height alignment adjustment. Existing account/Friends panels are reused; `FriendsPopover.tsx` changes only viewport-safe placement/caret direction for the bottom-sidebar anchor. No Friends services or global request deduplication changed. Keep cache/auth/global-provider optimization ownership separate.
