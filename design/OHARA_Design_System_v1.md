# OHARA Design System v1.0

Status: Prescriptive design foundation
Authority: `design/OHARA_Product_Constitution_v1.md`
Implementation baseline: `docs/UI_Audit_Report.md`

## 1. Purpose

This design system translates the OHARA Product Constitution into reusable interface rules. It defines the intended visual language, interaction behavior, token model, component families, accessibility requirements, and governance for public and authenticated OHARA experiences.

Version 1 is an alignment target. It documents how the existing system should converge without changing business logic, APIs, routing, authentication, feature names, logos, or workflows.

## 2. Experience Principles

### Calm by default

Use generous space, restrained color, short control groups, and progressive disclosure. Dense information is allowed when it is organized; visual noise is not.

### Reflective, not performative

Present progress as evidence and narrative. Avoid competitive language, punitive red states, arbitrary scores, or celebratory effects that overshadow meaning.

### One clear next action

Every page, panel, empty state, and dialog should make the primary next action apparent. Secondary actions remain available without competing visually.

### Consistent structure, distinct workspaces

Public, app, focused reflection, Echo, and Constellation may keep distinct atmospheres. They must share interaction contracts, accessibility, spacing rhythm, typography roles, state behavior, and semantic color meaning.

### Technology recedes

Reflection and AI experiences prioritize the user's words. System controls become quieter as reflective depth increases.

## 3. Design Contexts

| Context | Character | Required continuity |
|---|---|---|
| Public and auth | Warm, editorial, invitational | Brand voice, accessible controls, shared public header/footer/surfaces |
| Main app | Warm-neutral, organized, reflective | Common page shell, navigation, cards, forms, states |
| Focused reflection and goal creation | Dark, intimate, low-distraction | Shared focused tokens, minimal chrome, clear exit/progress |
| Echo | Dense but quiet workspace | Shared app semantics with compact density and pane behavior |
| Constellation | Exploratory, spatial, narrative | Graph-specific visual tokens with standard panels, forms, states, and accessibility |

Context differences must be tokenized. Do not introduce a sixth independent palette or component language for a new feature.

## 4. Token Architecture

Tokens have four layers:

1. **Primitive palette:** raw color, number, and font values. Defined once.
2. **Semantic tokens:** purpose-based values such as `text.primary`, `surface.card`, or `feedback.danger`.
3. **Context tokens:** public, focused, Echo density, and Constellation mappings.
4. **Component tokens:** rare, stable recipes such as `card.radius` or `control.height.default`.

Application components consume semantic, context, or component tokens. Raw literals belong only in token definitions, brand artwork, fixed illustrations, or data/category palettes.

## 5. Color

### 5.1 Canonical semantic roles

The current `LIGHT_THEME` and `DARK_THEME` in `constants/colors.ts` are the runtime baseline. Preserve their semantic structure while normalizing names in a future approved implementation.

| Role | Light baseline | Dark baseline | Use |
|---|---:|---:|---|
| `surface.page` | `#F7F4EE` | `#141414` | Page background |
| `surface.card` | `#FFFFFF` | `#202020` | Primary raised surface |
| `surface.sidebar` | `#EEE9DF` | `#1A1A1A` | Navigation and secondary chrome |
| `surface.input` | `#F0EDE6` | `#101010` | Editable control background |
| `surface.subtle` | `#EAE7E0` | `#0D0D0D` | Low-emphasis inset area |
| `surface.selected` | `#EEF2EF` | `#222A23` | Selected row or option |
| `text.primary` | `#24231F` | `#FFFFFF` | Main content |
| `text.secondary` | `#5F5B52` | `#B8B8B8` | Supporting content |
| `text.muted` | `#7C766B` | `#A3A3A3` | Metadata; never essential low-contrast copy |
| `accent.primary` | `#4A7C5F` | `#8FAE8A` | Primary actions, selected emphasis |
| `border.subtle` | existing theme alpha | existing theme alpha | Quiet structural separation |
| `border.control` | `#D8D2C8` | `#202020` | Form controls |
| `overlay.scrim` | `rgba(36,35,31,.24)` | `rgba(0,0,0,.48)` | Dialog/popover backdrop |

The landing palette, focused field palette, category accents, and Constellation tokens remain context mappings. Duplicate `PUBLIC_COLORS` and Tailwind `lp-*` values should ultimately reference one source.

### 5.2 Semantic feedback

- **Success:** affirmative completion, save, or healthy system state. Do not use BRT Bud as a generic success color unless the concepts truly coincide.
- **Danger:** destructive action or blocking error.
- **Warning:** consequential attention that is not yet an error.
- **Pending:** awaiting confirmation or processing.
- **Info:** neutral explanation.
- **BRT Bud/Rose/Thorn:** reflective meaning, not generic system status.

Every feedback role needs foreground, background, border, and icon colors in light and dark themes.

### 5.3 Color rules

- Green is restrained. Use it for action, selection, growth meaning, and key narrative emphasis, not as ambient decoration everywhere.
- Never communicate state through color alone.
- Avoid more than one saturated accent in a local control group unless data semantics require it.
- Warm-neutral near-duplicates must map to named surface, text, or border roles.
- Category colors may identify goal categories but must not replace readable labels.
- Minimum contrast: WCAG 2.2 AA for text and meaningful UI boundaries.

## 6. Typography

### 6.1 Font roles

- **Inter:** application UI, controls, navigation, structured data, and body copy.
- **Instrument Serif or Lora:** editorial/public display and intentional reflective moments only.
- **Space Mono:** timers, compact measurements, or code-like data where fixed width improves reading.

Do not introduce another font without design approval.

### 6.2 Semantic scale

| Token | Size / line height | Weight | Typical use |
|---|---|---|---|
| `display` | 36 / 44 | Semibold or editorial regular | Public hero, rare reflective statement |
| `pageTitle` | 30 / 38 | Semibold | Screen title |
| `sectionTitle` | 24 / 32 | Semibold | Major page section |
| `panelTitle` | 20 / 28 | Semibold | Card/panel heading |
| `title` | 17 / 24 | Medium/Semibold | Row or compact card title |
| `body` | 15 / 22 | Regular | Default copy |
| `bodySmall` | 13 / 18 | Regular | Supporting copy |
| `label` | 13 / 18 | Medium | Form/control label |
| `caption` | 12 / 16 | Regular/Medium | Metadata |
| `overline` | 11 / 16 | Semibold | Short uppercase section cue |
| `micro` | 10 / 14 | Medium | Dense metadata only |

Feature-specific names such as Echo entry title should alias these roles or a documented compact density variant. Avoid global variants tied to a single screen.

### 6.3 Typography rules

- Use sentence case for headings and actions.
- Limit uppercase to short overlines, compact categories, and data labels.
- Use italics sparingly for reflective voice, not general emphasis.
- Prefer 45-75 characters per line for long-form copy.
- Do not place essential body copy below 12px.
- Truncation must preserve access to the full value through detail view, expansion, or accessible label.

## 7. Spacing and Layout

### 7.1 Spacing scale

Use a 4px-centered scale with compact 2px increments where dense UI requires them:

| Token | Value |
|---|---:|
| `space.0` | 0 |
| `space.0_5` | 2 |
| `space.1` | 4 |
| `space.1_5` | 6 |
| `space.2` | 8 |
| `space.3` | 12 |
| `space.4` | 16 |
| `space.5` | 20 |
| `space.6` | 24 |
| `space.8` | 32 |
| `space.10` | 40 |
| `space.12` | 48 |
| `space.16` | 64 |

Values outside the scale require a named layout token, such as sidebar width or chart height.

### 7.2 Layout rules

- Page gutters: 16px compact, 24px standard, 32-40px wide desktop.
- Reading/content widths should be capped; full-width is reserved for spatial workspaces such as Echo and Constellation.
- Major page sections use 32-48px vertical separation.
- Panel interiors use 16px compact, 20px standard, or 24px spacious padding.
- Dense Echo/Friends rows may use compact spacing but must retain a 44x44px effective touch target where interactive.
- Responsive thresholds and shared sidebar/content offsets must be centralized rather than component-local.

## 8. Shape, Borders, Elevation, and Glass

### 8.1 Radius scale

| Token | Value | Use |
|---|---:|---|
| `radius.xs` | 4 | Tiny indicators |
| `radius.sm` | 8 | Compact controls |
| `radius.md` | 12 | Inputs and buttons |
| `radius.lg` | 16 | Standard cards |
| `radius.xl` | 20 | Dialogs and hero surfaces |
| `radius.2xl` | 24 | Large editorial surfaces |
| `radius.round` | 999 | Pills and circles |

### 8.2 Border rules

- Use one subtle border for structural clarity when elevation or surface contrast is insufficient.
- Do not stack a strong border, shadow, and contrasting background without a functional reason.
- Focus rings are interaction feedback, not decorative borders.
- Remove non-semantic badges and framed labels that repeat nearby text.

### 8.3 Elevation scale

- `none`: flat page/inset content.
- `sm`: interactive or raised card.
- `md`: floating menu, toolbar, or sticky control.
- `lg`: dialog or high-priority overlay.

Each token must resolve to equivalent web and native shadow/elevation recipes. Shadow color comes from a semantic effect token, never local black literals.

### 8.4 Glassmorphism

Glass is a signature accent, not the default surface. Use it for floating navigation, overlays, or rare narrative moments only when:

- text contrast remains AA;
- content behind it does not reduce comprehension;
- reduced transparency and native fallbacks are available;
- performance remains acceptable;
- the surface still has a readable border/elevation cue.

## 9. Motion

- Motion explains state, continuity, or spatial change.
- Standard durations: 120-160ms for control feedback, 180-240ms for panels, 240-360ms for meaningful transitions.
- Use calm ease-out for entry and ease-in for exit.
- Avoid celebratory or looping motion in reflective workflows.
- Respect reduced-motion preferences. Preserve state changes without animation.
- Loading animation should communicate activity without demanding attention.

## 10. Iconography and Imagery

- Use the existing OHARA brand marks unchanged.
- Maintain one icon family and consistent optical sizing within application controls.
- Icon-only buttons require accessible names, tooltips on desktop where helpful, and minimum hit targets.
- Illustrations and gradients support narrative or orientation; they do not fill empty space by default.
- User-generated or personal imagery must never reduce the readability of reflective content.

## 11. Core Component Standards

### Button

Variants: primary, secondary/tonal, outline, ghost, danger, and icon-only. Sizes: compact and default. Every variant must support loading, disabled, pressed, hover, focus-visible, and full-width behavior. One primary action per local decision area.

### Card and Panel

Variants: standard, inset, elevated, interactive, dark/focused, and inspector. Cards act as entry points; panels organize work. Interactive cards need a clear focus state and must not hide essential actions behind hover alone.

### Input and Form Field

Support label, value, placeholder, help, error, disabled, read-only, focus, prefix/suffix, multiline, and search. Errors explain recovery. Placeholder text never replaces a persistent label when the field's meaning could be ambiguous.

### Modal and Dialog

Sizes: compact confirmation, standard form, large workflow. Every dialog has a labelled title, clear close behavior, keyboard focus containment on web, Escape handling where safe, and a standard action footer. Destructive confirmation names the affected object and consequence.

### Popover and Menu

Anchor visually and semantically to its trigger. Provide keyboard navigation, click/tap outside handling, viewport collision behavior, and a selected/destructive item state.

### Navigation

Desktop uses the shared sidebar. Detail screens use a shared header/back pattern. Narrow layouts require a deliberate global navigation path, not merely disappearance of the sidebar. Current route names and workflow remain unchanged.

### Tabs and Segmented Controls

Use tabs for peer views; segmented controls for a small mutually exclusive mode choice; pills for filters. Selected state must include more than color. Preserve state when navigating away where the workflow already does so.

### Badge

Badges are reserved for concise status, category, BRT, or exceptional metadata. Do not badge information already stated by the title or section. Use semantic variants.

### Empty, Loading, Error, and Success States

Provide page, panel, list, inline, and compact variants. Each state explains what happened and, when actionable, offers one clear next step. Skeletons should resemble stable layout; spinners suit short indeterminate work; Constellation may retain its signature loading mark.

### Charts and Progress

Charts tell a story, not merely display numbers. Every chart needs a title, timeframe/context, text alternative or accessible summary, semantic legend, loading/empty/error state, and non-color differentiation where series can be confused. Progress language remains descriptive and nonjudgmental.

### AI and Reflection Surfaces

The user's words are visually primary. AI observations are clearly attributable but not visually dominant. Distinguish source material, summary, inference, and recommendation. Avoid chat-product chrome that makes Echo feel like a generic assistant.

## 12. Accessibility and Responsive Requirements

- Meet WCAG 2.2 AA.
- Minimum touch target: 44x44px; compact visual controls may use expanded hit areas.
- All interactive elements must be reachable and operable by keyboard on web.
- Focus order follows visual and task order.
- Focus-visible states must not rely on browser defaults that conflict with the design.
- Screen-reader names must include purpose and current state where relevant.
- Announce asynchronous success/error updates.
- Support text scaling and avoid fixed-height text containers that clip content.
- Do not rely on hover, color, gesture, or spatial position alone.
- Responsive verification must cover compact phone, large phone/tablet, narrow desktop, and wide desktop.
- Constellation must retain its accessible list alternative.

## 13. Content and Voice

OHARA sounds thoughtful, direct, warm, and nonjudgmental.

- Describe, do not grade.
- Prefer “What changed?” over “Did you succeed?”
- Prefer “Continue reflecting” over “Chat with AI.”
- Avoid artificial urgency and productivity clichés.
- Use specific action labels instead of “Submit” or “OK.”
- Error copy states what happened, what was preserved, and what to do next.
- Empty states invite meaningful action without implying failure.

## 14. Governance

### Adding a token

Add a token only when at least two components share the same semantic need, or when a stable brand/accessibility rule requires it. Document light/dark/context behavior.

### Adding a component

Create a shared component when behavior, accessibility, and visual structure repeat. Do not abstract merely because two files share markup. A shared component needs documented variants, states, responsive behavior, and ownership.

### Review checklist

- Constitution alignment
- Workflow preservation
- Token use; no unexplained literals
- Component reuse
- All interaction and async states
- Keyboard/screen-reader/touch behavior
- Contrast and text scaling
- Responsive layouts
- Light/dark/context verification
- Visual regression coverage

## 15. Known Version 1 Gaps

The UI audit identifies incomplete adoption rather than a missing foundation. Version 1 modernization should address:

- duplicate public and app color sources;
- 20+ radius values and 40+ spacing literals;
- one-off shadow recipes;
- underused shared Button, Input, Card, Modal, and EmptyState primitives;
- duplicate goal cards, title rows, project forms, chat lists, charts, and selection dialogs;
- local empty/loading/error patterns;
- inconsistent mobile authenticated navigation;
- unused or superseded components requiring product confirmation.

These gaps are implementation work, not permission to alter product behavior.
