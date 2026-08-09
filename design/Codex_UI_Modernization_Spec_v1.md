# Codex UI Modernization Specification v1.0

Status: Implementation specification  
Governing documents: `design/OHARA_Product_Constitution_v1.md`, `design/OHARA_Design_System_v1.md`  
Evidence baseline: `docs/UI_Audit_Report.md`

## 1. Objective

Modernize OHARA's UI so the existing product feels calmer, clearer, more intentional, more accessible, and more premium while preserving every feature and workflow.

This specification is for scoped UI modernization. It is not authorization for a product redesign, architecture rewrite, or behavior change.

## 2. Non-Negotiable Constraints

Codex must not change, without explicit task-level approval:

- business logic or domain rules;
- API endpoints, request/response contracts, or database behavior;
- routing paths or navigation outcomes;
- authentication or authorization behavior;
- feature names, user-facing concepts, logos, or brand marks;
- creation, editing, completion, reflection, linking, or deletion workflows;
- analytics meaning, progress calculations, or AI pipeline behavior.

Codex must:

- make minimal, targeted, non-breaking changes;
- preserve phase integrity and existing architecture;
- keep public, app, focused, Echo, and Constellation contexts intentional;
- update `CHANGELOGCODEX.md` for every future code change, as required by repository instructions;
- stop and request direction when visual modernization would require a product decision.

## 3. Source-of-Truth Order

1. Explicit user instruction for the active task.
2. OHARA Product Constitution.
3. Existing behavior and workflow contracts.
4. Accessibility, security, and platform requirements.
5. OHARA Design System.
6. This modernization specification.
7. Existing visual implementation.

If existing visuals conflict with the Constitution or Design System, Codex may propose alignment but must preserve behavior.

## 4. Baseline Findings

The UI audit establishes the following modernization drivers:

- Five visual contexts coexist with incomplete shared-system adoption.
- The semantic light/dark theme is strong but overlaps with Tailwind, public, focused, category, and local literal palettes.
- More than 20 radius values, 40 spacing values, and many shadow recipes are present.
- Shared primitives exist but many screens rebuild buttons, cards, inputs, modals, selection controls, and states.
- Duplicate families include goal cards, title rows, project creation forms, chat lists, trend charts, selection dialogs, and empty/loading/error treatments.
- Responsive page shells and mobile authenticated navigation are inconsistent.
- Echo and Constellation have justified specialized structures but can reuse global semantics around their cores.

## 5. Target Outcomes

A successful modernization produces:

- one semantic token source with documented context mappings;
- a small, consistent spacing, radius, control-size, and elevation system;
- shared interaction contracts for buttons, forms, dialogs, menus, tabs, and states;
- consistent page/header/panel hierarchy across authenticated screens;
- preserved signature identities for public, focused, Echo, and Constellation experiences;
- complete keyboard, screen-reader, contrast, text-scaling, and touch-target behavior;
- no regression in route, data, workflow, or AI behavior;
- visual regression coverage for major contexts and breakpoints.

## 6. Workstream A: Foundations

### A1. Token inventory and aliases

Create typed aliases for semantic surface, text, border, accent, feedback, BRT, overlay, and chart roles. Preserve current values initially. Do not perform a visible repalette during token extraction.

Acceptance criteria:

- Existing light/dark appearance is visually unchanged.
- Public, focused, category, and Constellation values are expressed as context mappings.
- New component code uses no unexplained raw colors.
- Legacy token names remain temporarily compatible where required.

### A2. Spacing, radius, and size tokens

Introduce the Design System scales. Map existing common values first. Do not normalize exceptional dimensions until each component has visual parity coverage.

Acceptance criteria:

- Shared components use named values.
- New arbitrary radii or spacing require an inline rationale or design-system update.
- Large layout dimensions are named separately from spacing.

### A3. Cross-platform elevation

Create `none`, `sm`, `md`, and `lg` shadow/elevation recipes for web and native.

Acceptance criteria:

- Card, floating control, popover, and dialog elevations render consistently.
- Local `#000` shadow colors are removed only as migrated components adopt semantic recipes.
- Dark mode does not show unintended halos.

### A4. Typography mapping

Map existing Typography variants to the semantic scale. Keep temporary aliases for feature-specific variants.

Acceptance criteria:

- No copy, wrapping, or truncation regression.
- Echo compact density remains legible.
- Public editorial typography remains distinct.
- Raw text styles are reduced during component migration, not via a risky global rewrite.

## 7. Workstream B: Core Primitives

### B1. Button and IconButton

Extend the shared Button to cover primary, tonal, outline, ghost, danger, icon-only, compact, default, loading, disabled, full-width, and focus-visible states.

Do not migrate a button if the current action semantics are unclear.

Acceptance criteria:

- Minimum effective hit target is 44x44px.
- Pressed, hover, focus, disabled, and loading states are visually and semantically distinct.
- Loading does not change button width unexpectedly.
- Destructive actions remain clearly differentiated.

### B2. Card and Panel

Add standard, inset, elevated, interactive, focused, and inspector variants to a shared surface primitive.

Acceptance criteria:

- Borders are quiet and only used when needed.
- Interactive surfaces have keyboard focus and pressed/hover feedback.
- Padding and radius follow tokens.
- Feature identity is provided by content/context tokens, not a new shell per feature.

### B3. Form field family

Extend Input into `FormField`, `TextInput`, `TextArea`, and `SearchInput` patterns with label, help, error, prefix/suffix, disabled, and read-only behavior.

Acceptance criteria:

- Labels remain visible when fields contain content.
- Error copy explains recovery and is announced accessibly.
- Web autofill/focus and native keyboard behavior remain unchanged.
- No form validation or submission logic changes.

### B4. Modal, dialog, and popover

Standardize sizes, headers, close controls, scroll areas, action footers, focus management, scrims, and elevations.

Acceptance criteria:

- Escape/back/outside-dismiss behavior matches current workflow safety.
- Focus is trapped and restored on web.
- Destructive dialogs name the object and consequence.
- Content remains usable with text scaling and compact screens.

### B5. Tabs, segments, pills, and badges

Document and implement distinct patterns for peer navigation, mode choice, filtering, and status metadata.

Acceptance criteria:

- Selection is not conveyed by color alone.
- Keyboard navigation follows platform conventions.
- Unnecessary badges are removed only when their information is duplicated and product meaning is unchanged.

### B6. State components

Create page, panel, list, inline, and compact variants for empty, loading, error, and success states.

Acceptance criteria:

- Each actionable state has one clear next action.
- Error state preserves and explains recoverable user work.
- Loading layout minimizes shift.
- Copy remains nonjudgmental.

## 8. Workstream C: Shared Layout

### C1. Page container

Create a shared responsive page container for background, gutter, content width, scrolling, safe areas, and standard vertical rhythm. Spatial workspaces may opt out of width constraints.

### C2. Detail header

Extend the existing `AppHeader` pattern across goal, project, entry, Vault, and form/detail screens where behavior permits.

### C3. Authenticated mobile navigation

Document and implement a deliberate narrow-screen navigation path without changing route names. This is a product-sensitive work item: Codex must present the proposed behavior and receive explicit approval before implementation.

### C4. Public/auth shell

Bring Login, Signup, Forgot Password, Reset Password, About, and not-found treatments into a coherent public family while preserving auth behavior.

## 9. Workstream D: Feature Consolidation

Each item is a separate scoped change with its own verification.

### D1. Goals

- Extract a composable goal-card base used by full and ring/compact variants.
- Consolidate goal/project title rows into a branded title-row primitive.
- Create a shared goal-detail panel shell for Milestones, Trackers, Intelligence, Analytics, Recommended, and summary panels.
- Standardize goal creation selection cards, form fields, review sections, and modal footers.
- Preserve all calculations, status rules, actions, and route behavior.

### D2. Projects

- Extract one ProjectForm for modal and standalone route.
- Standardize project card, goal row, empty state, and confirmation dialog surfaces.
- Preserve store/service calls and navigation outcomes.

### D3. Entries and reflections

- Standardize library rows/cards and page states.
- Reuse shared detail header, selection dialog, modal footer, and form states.
- Keep platform-specific rich text editor implementations.
- Preserve editor content, autosave, export, linking, and deletion behavior.

### D4. Echo

- Preserve the three-pane model and pane-resize behavior.
- Tokenize pane surfaces, dividers, selected rows, dense spacing, and typography aliases.
- Reuse shared Modal for create-folder and move-entry dialogs where dismissal behavior can remain identical.
- Extract shared entry form fields between composer and edit form.
- Keep Echo visually reflective rather than chat-product-like.

### D5. Friends and account

- Standardize popover/dialog shells, rail controls, rows, state presentation, and form fields.
- Preserve invitation, request, acceptance, decline, settings, and account behavior.

### D6. Momentum and charts

- Extract responsive chart frame, line/area geometry, axes/grid, legend, tooltip, and chart states.
- Share mechanics between public and authenticated charts while retaining separate context styling.
- Add accessible summaries and non-color differentiation.
- Preserve analytics calculations and meaning.

### D7. Constellation

- Preserve graph data, layout, gestures, selection, inspector behavior, and accessible list.
- Retain `createConstellationVisualTokens` as a graph-context adapter.
- Reuse shared panel, field, modal, action, and state primitives around the canvas.
- Keep node/edge rendering feature-specific.

## 10. Workstream E: Unused and Superseded UI

The audit found components with no clear production imports, including `AboutUs`, `AffiliateTeaser`, `GoalTree`, `PublicConstellation`, `QuickEntryModal`, `ChatMessageList`, `GoalGrid`, `TodayGoalCard`, and `TodayCarousel`.

Codex must not delete them as part of incidental modernization. For each candidate:

1. Search runtime, preview, tests, documentation, and dynamic references.
2. Determine whether it is planned, superseded, or dead.
3. Request explicit cleanup approval.
4. Remove in a dedicated change with changelog and verification.

## 11. Implementation Sequence

### Phase 0: Baseline and guardrails

- Capture representative screenshots for major routes and contexts.
- Record supported viewport sizes and themes.
- Establish behavioral smoke tests and accessibility checks.
- Freeze scope: UI only.

### Phase 1: Tokens without visual change

- Introduce aliases and platform recipes.
- Map shared primitives to tokens.
- Verify screenshot parity.

### Phase 2: Primitive completeness

- Complete Button, surface, form, overlay, navigation-control, and state variants.
- Add component-level tests and examples.

### Phase 3: Low-risk migration

- Migrate leaf controls, badges, modal footers, simple cards, and state blocks.
- Work one feature or component family at a time.

### Phase 4: Layout and feature consolidation

- Adopt page/header/panel shells.
- Consolidate goal/project/entry/Echo/Friends patterns.
- Keep commits and reviews scoped by feature.

### Phase 5: Specialized visualization alignment

- Align Momentum charts and Constellation surrounding UI.
- Verify accessibility and reduced motion.

### Phase 6: Approved cleanup

- Remove deprecated aliases and explicitly approved unused components.
- Update design-system documentation to reflect final implementation.

Do not start a later phase merely because an earlier token or primitive exists. A phase advances when its acceptance criteria and visual/behavioral verification are complete.

## 12. Codex Execution Protocol

For every implementation task, Codex must:

1. Read the Constitution, Design System, this spec, repository instructions, and relevant source files.
2. State the exact UI surface, preserved behavior, assumptions, and out-of-scope items.
3. Inspect the current responsive, theme, loading, empty, error, disabled, focus, hover, and pressed states.
4. Prefer existing shared components; extend them only when the need is genuinely reusable.
5. Make the smallest coherent change.
6. Avoid renames, file moves, dependency additions, and architectural changes unless required and approved.
7. Verify behavior, types, tests, accessibility, and representative visual states.
8. Review the diff for accidental product or workflow changes.
9. Update `CHANGELOGCODEX.md` with what, why, and affected files.
10. Report what changed, what was verified, and any remaining risk.

## 13. Verification Matrix

Every migrated surface must be checked against applicable rows:

| Dimension | Required checks |
|---|---|
| Behavior | Same actions, data, validation, persistence, navigation, and dismissal |
| Responsive | Compact phone, large phone/tablet, narrow desktop, wide desktop |
| Theme | Light, dark, focused, public, or graph context as applicable |
| Input | Keyboard, pointer, touch, screen reader, text scaling |
| States | Default, hover, focus, pressed, selected, disabled, loading, empty, error, success |
| Content | Short, long, missing, multiline, localized-like expansion |
| Visual | Spacing, type, radius, elevation, border, alignment, overflow |
| Performance | No unnecessary rerenders, animation jank, or graph/editor regression |

## 14. Definition of Done for a Modernization Change

A change is done when:

- its scope is explicitly UI-only;
- all existing behavior is preserved;
- it conforms to semantic tokens and shared interaction patterns;
- it improves clarity and reduces visual clutter;
- it is accessible and responsive;
- all applicable states are implemented;
- tests and type checks pass, or unrelated failures are clearly identified;
- representative visual comparisons show no unintended regression;
- no unrelated files are changed;
- `CHANGELOGCODEX.md` is updated for code changes;
- the result helps the user feel capable, understood, or intentional.

## 15. Stop Conditions

Codex must stop and request direction if:

- preserving behavior conflicts with the proposed visual change;
- a route, feature name, workflow, business rule, or API would need to change;
- mobile navigation behavior requires a new product decision;
- removal of a badge, label, or state could change meaning;
- an accessibility fix materially changes interaction order or workflow;
- multiple plausible designs exist and the choice would establish new product direction;
- the required source of truth is missing or contradictory.

## 16. Modernization Success Measures

Version 1 modernization is successful when:

- new UI uses semantic tokens by default;
- repeated raw color, radius, spacing, and shadow literals materially decline;
- core primitives cover the application's real states and contexts;
- duplicate component families have approved consolidation paths;
- page and panel hierarchy is predictable across features;
- public, focused, Echo, and Constellation retain their identities;
- accessibility defects decrease and visual QA becomes repeatable;
- users can more easily answer: what matters today, what today means, and how they are changing.
