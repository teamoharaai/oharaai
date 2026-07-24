# Session 4 — Anchored Desktop Friends and Account UI

## Recommended run

- Model: `gpt-5.6-sol`
- Reasoning effort: `xhigh`
- Use `max` only for a separate final accessibility and regression review.

## Prompt

You are implementing Session 4 of Ohara's Friends surface: the anchored desktop
account/Friends UI.

Work in `/Users/justin.villalta/oharaai`. Read `AGENTS.md`,
`CHANGELOGCODEX.md`, the completed Session 2 and Session 3 contracts, all three
files in `docs/handoffs/friends/`, the current `AvatarMenu` and
`AnchoredPopover`, theme/accessibility primitives, and the relevant prototype
under `handoff_account_tab/` before editing. The checked-in API and state code
are authoritative. Update `CHANGELOGCODEX.md` for every code change.

### Locked product direction

- Use the handoff's anchored desktop account/Friends popover as the canonical
  visual and interaction reference.
- Replace the current wide-web centered AvatarMenu experience with that
  anchored surface.
- Preserve the existing accessible light/dark mode `Toggle`.
- Keep the existing compact web/native account menu at widths below 900 px.
  Do not add a mobile bottom sheet.
- A friendship currently has no product capability beyond being a friend.
  Friend rows are informational and must not navigate to a new public profile
  or imply access to goals, Echo, projects, feeds, or private content.
- Keep the Friends UI behind `SOCIAL_ENABLED` during implementation and QA.
  Enable it only as the final scoped step after the full verification list
  passes; otherwise explicitly leave it disabled and report why.

### Architecture and component boundaries

Place Friends components under `features/friends/components/`, not a new
top-level `components/friends` tree. Keep presentation components prop-driven
and consume Session 3 state through its intended controller boundary.

Reuse the existing account, profile/settings, theme-toggle, logout, and
account-switching behavior. Label the avatar trigger accessibly as
`Open account and friends`.

Do not regress other consumers of the shared `AnchoredPopover`. If the handoff
placement needs behavior that the primitive lacks, add a backwards-compatible
optional placement API or keep the specialized positioning feature-owned.
Verify existing Echo popovers after any shared primitive edit.

### Handoff fidelity

Follow the handoff's anchored shell, caret, rail, pane structure, copy hierarchy,
and approximately 720/240/480 desktop proportions, adapting them to real tokens,
accessibility, and data. Show `@username` in the account summary instead of
`Free plan`.

Do not show the prototype's inaccurate Active Goals statistic. Strong
recommendation: keep Friends and Sent counts only, without adding cross-feature
queries. Implement Friends, Requests, and Add as the content tabs.

Relationship actions in Add search:

- `none`: Add
- `pending_out`: Pending, disabled
- `pending_in`: Review; switch to Requests
- `friends`: Friends, disabled
- `self`: You, disabled

Include intentional initial-loading, refresh/error/retry, empty, no-result, and
per-row busy/error states. Do not create fake data fallbacks.

### Responsive and accessibility requirements

- Switch to the anchored desktop mode at 900 px and above.
- Clamp width/height to the viewport and make the content pane scroll correctly
  in short desktop windows.
- Handle live resize across the breakpoint without reopening a menu the user
  closed or leaving a hidden modal mounted.
- Support outside click, Escape, an explicit close button, and focus restoration
  to the avatar trigger.
- Use tablist semantics only for Friends, Requests, and Add. Settings and
  logout are buttons/actions, not tabs.
- Implement correct selected/focus states and keyboard navigation for the
  tablist, including arrow-key behavior if using tab semantics.
- Preserve the theme control's switch semantics and accessible name.
- Use repository theme tokens for surfaces, borders, overlay, shadows, and
  states. Avoid new hard-coded light/dark hex values.
- Prefer the repository's local SVG/icon system over Unicode placeholder
  glyphs.

### Scope boundary

This session owns the anchored desktop UI, its responsive fallback integration,
accessibility, theme fidelity, and final feature-flag decision. It does not own
new schema/API behavior, public friend profiles, unfriend, cancel request,
block/report, feeds, friend-powered permissions, or a new mobile surface.

Route any API contract problem back to Session 2 and any store/concurrency
problem back to Session 3. Keep layout, accessibility, copy, responsive,
theming, and handoff-fidelity follow-ups in this session. When the prototype
conflicts with security or accessibility, preserve its product intent while
choosing the secure/accessibility-correct behavior and document the deviation.

### Verification

Verify:

- light and dark modes;
- collapsed and expanded account states;
- widths immediately below and at 900 px;
- short desktop viewport height and scrolling;
- loading, errors, retry, empty lists, search, Add, accept, and decline;
- concurrent per-row busy states supplied by Session 3;
- outside click, Escape, close, focus restoration, tab order, and arrow keys;
- logout and account switching with no previous-account Friends data retained;
- existing Echo anchored-popover behavior if the shared primitive changed.

Run `npx tsc --noEmit`, `git diff --check`, the relevant tests, and an Expo web
export. Perform a signed-in desktop smoke test against real API/state behavior
before enabling the flag. Finish with a short fidelity report noting any
deliberate deviations from `handoff_account_tab/`.
