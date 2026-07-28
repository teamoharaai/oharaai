# Constellation — Implementation Handoff

**Design reference (do not modify — treat as pixel spec):**

| Concept | Screenshot |
|---|---|
| 1a — Main canvas, restrained | `concepts/1a-canvas-restrained.png` |
| 1b — Main canvas, atmospheric (dark) | `concepts/1b-canvas-atmospheric.png` |
| 1c — Goal inspector | `concepts/1c-goal-inspector.png` |
| 1d — Reflection inspector + BRT picker | `concepts/1d-reflection-inspector.png` |
| 1e — Empty state / onboarding | `concepts/1e-empty-state.png` |

Original interactive source at `reference/Constellation Concepts.dc.html` (not standalone — requires the design tool to render; open in a browser for a raw view of the markup only).

---


Maps the five concepts in `Constellation Concepts.dc.html` (1a–1e) onto the current `oharaai` Expo/RN‑Web codebase. Written to land with **minimal conflict** against active lanes: no changes to `lib/ai/`, `lib/db/`, `app/api/`, `supabase/migrations/`, or `store/` beyond additive additions. The current `app/(app)/constellation.tsx` (Screen 1e's ancestor) is replaced; nothing else is touched.

Status of what already exists (don't rebuild):
- `constants/colors.ts` → `LIGHT_THEME` / `DARK_THEME` — all warm-cream, forest-green, BRT and feedback tokens already defined. **Use these. Do not add new hex.**
- `components/constellation/ConstellationSample.web.tsx` — the static teaser SVG on the current unlock screen. Keep as-is; the new empty state replaces the screen that hosts it.
- `constants/features.ts` `FEATURES.CONSTELLATION_ENABLED` gate — reuse it.
- Sidebar chrome, Typography, Button, Card, Toggle, ProgressRing — all in `components/`, all applied.

Do NOT touch (other lanes):
- `lib/ai/*`, `lib/db/*`, `app/api/*`, `supabase/migrations/*`, `store/*` (except one Zustand slice added additively — see §5).
- `features/echo/*`, `features/goals/*` internals — Constellation reads from them via existing selectors only.

---

## 1. Concept → screen mapping

| Concept | Route | New file(s) |
|---|---|---|
| **1a** Main canvas · restrained | `app/(app)/constellation.tsx` (rewritten) | `components/constellation/ConstellationCanvas.tsx` (+ `.web.tsx`) |
| **1b** Main canvas · atmospheric | Same route, gated by `themeMode === 'dark'` **OR** a `constellationAmbient` UI store flag. **Do not ship both palettes on the light theme** — the atmospheric variant is the dark-mode rendering. Reuse the same canvas component, swap the token bag. |
| **1c** Goal inspector | Right drawer on the same canvas, opened when `selectedNodeId` refs a goal | `components/constellation/inspectors/GoalInspector.tsx` |
| **1d** Reflection inspector · BRT picker | Same drawer, reflection variant | `components/constellation/inspectors/ReflectionInspector.tsx` + `components/constellation/BRTPicker.tsx` |
| **1e** Empty state / onboarding | Same route, rendered when gates aren't met | `components/constellation/ConstellationEmptyState.tsx` |

Gate logic already lives in the current `constellation.tsx`: `goalCount >= 3 && echoCount >= 10`. Keep that gate. Show `<ConstellationEmptyState/>` under threshold, `<ConstellationCanvas/>` at/above.

---

## 2. File map

**New** (all under `components/constellation/`):
```
ConstellationCanvas.tsx           // dispatches to .web.tsx via Metro suffix
ConstellationCanvas.web.tsx       // the real implementation (react-native-svg on web)
ConstellationEmptyState.tsx
BRTPicker.tsx                     // shared, also usable in Echo composer later
Legend.tsx
NodeSprout.tsx                    // the "sprouted goal name" callout
tokens.ts                         // graph-only tokens, reads LIGHT_THEME/DARK_THEME
graph.ts                          // pure functions: layout, edge geometry, valence class → color
data.mock.ts                      // seed nodes/edges for Phase 1 render before the pipeline lights up
inspectors/
  GoalInspector.tsx
  ReflectionInspector.tsx
  AmbitionInspector.tsx
  TensionInspector.tsx
  FutureSelfInspector.tsx
  InspectorFrame.tsx              // shared header/close/actions
types.ts                          // local view types (see §3)
```

**Touched**:
```
app/(app)/constellation.tsx       // full rewrite of the render, gate logic preserved
app/(app)/_layout.tsx             // no change (Constellation already registered)
components/layout/Sidebar.tsx     // add BrandIcon 'constellation' if missing; see §7
constants/features.ts             // no change — CONSTELLATION_ENABLED already exists
constants/colors.ts               // ADD (do not modify) a `graph` token group; see §4
store/uiStore.ts                  // ADD one slice (constellationAmbient, sidebarCollapsed exists); see §5
CHANGELOGCODEX.md                 // append entry per AGENTS.md rule 1
```

**Deferred** (owned by other lanes, do not add in this PR):
- Migration `012_constellation_nodes_edges.sql` — CTO decision; canvas reads from `data.mock.ts` until then.
- `lib/db/constellation.ts` — CTO.
- `app/api/constellation/*` — CTO.
- Candidate extraction wiring — Ariel (`lib/ai/`).
- Vector infra (Section 7 of the spec) — separate PRs already scoped in `constellation_conv3_block_summary.md`.

---

## 3. Types — `components/constellation/types.ts`

These are **view** types, not persistence. The persistence contract lives in the spec (Section 2) and will land with migration 012. Keep these shapes minimal and structurally compatible so the swap is a rename.

```ts
export type NodeType = 'season' | 'ambition' | 'goal' | 'reflection' | 'trait' | 'tension' | 'future';
export type BRT = 'B' | 'R' | 'T';
export type Valence = 'positive' | 'mixed' | 'negative' | 'contradictory' | 'future' | 'season' | 'manual';

export interface GraphNode {
  id: string;
  type: NodeType;
  label: string;
  x: number; y: number;                // Phase 1: hand-authored positions in mock; Phase 2: force layout
  brt?: BRT;                           // reflection only
  streak?: number; vault?: number;     // goal only
  ambition?: string;                   // goal only
  futureId?: string;                   // goal/reflection → future-self link
  sideA?: string; sideB?: string;      // tension only
  description?: string;
  meta?: Record<string, unknown>;
}

export interface GraphEdge {
  id: string;
  from: string; to: string;
  valence: Valence;
  weight?: number;                     // spec Section 4c
  manual?: boolean;                    // user-drawn vs system-generated
}
```

---

## 4. Tokens — `components/constellation/tokens.ts`

The design uses **only** LIGHT_THEME tokens plus a few graph-specific compositions. Do not introduce raw hex in components.

```ts
import { LIGHT_THEME, DARK_THEME, type ThemeColors } from '@/constants/colors';

export function graphTokens(colors: ThemeColors) {
  return {
    // Node fills
    seasonFill:    colors.effects.shadow,         // deep emerald
    ambitionFill:  colors.accent.primary,
    goalFill:      colors.background.card,
    goalStroke:    colors.accent.primary,
    goalSelected:  colors.accent.primary,
    reflectionFill:   colors.background.page,
    reflectionStroke: colors.text.secondary,
    traitFill:     colors.accent.primary,
    tensionStroke: colors.brt.rose,
    futureFill:    colors.background.goalCard,
    futureStroke:  colors.accent.tealMid,

    // BRT swatches
    bud:   colors.brt.bud,
    rose:  colors.brt.rose,
    thorn: colors.brt.thorn,

    // Edges by valence
    edge: {
      positive:      { stroke: colors.accent.primary, dash: undefined, opacity: 0.7 },
      mixed:         { stroke: 'url(#edge-mix)',      dash: undefined, opacity: 1   },
      negative:      { stroke: colors.feedback.danger.text, dash: undefined, opacity: 0.65 },
      contradictory: { stroke: colors.feedback.danger.text, dash: '4 3',    opacity: 0.55 },
      future:        { stroke: colors.accent.tealMid,       dash: '2 4',    opacity: 0.55 },
      season:        { stroke: colors.text.secondary,       dash: undefined, opacity: 0.28 },
      manual:        { stroke: colors.accent.tealMid,       dash: '5 3',    opacity: 0.9  },
    },

    // Halos (aggregate valence glow around a cluster)
    halo: {
      bud:   'rgba(74,124,95,0.22)',
      rose:  'rgba(245,158,11,0.24)',
      thorn: 'rgba(239,68,68,0.24)',
      teal:  'rgba(47,143,109,0.22)',
    },

    // Labels
    labelDefault: colors.text.secondary,
    labelMuted:   colors.text.muted,
    labelTrait:   colors.text.accent,
    labelTension: colors.feedback.pending.text,   // amber-B45309
    labelFuture:  colors.accent.tealMid,
  };
}
```

`ConstellationCanvas` calls `graphTokens(useThemeColors())` once per render. Dark mode passes through automatically because the theme swap goes through `DARK_THEME`.

---

## 5. Store slice — `store/uiStore.ts`

Add these fields to the existing `useUIStore`. **Additive**, no rename:

```ts
// existing slice keeps sidebarCollapsed, themeMode, etc.

constellationAmbient: boolean;      // 1b atmospheric override on light theme
setConstellationAmbient: (v: boolean) => void;

constellationSelectedId: string | null;
setConstellationSelected: (id: string | null) => void;

constellationFilters: {
  reflection: boolean; trait: boolean; tension: boolean; future: boolean;
};
toggleConstellationFilter: (k: keyof this['constellationFilters']) => void;
```

Selection lives in the store (not in `constellation.tsx` local state) so the sidebar's later "recent nodes" surface and Vault deep-links can hydrate it.

---

## 6. Component skeletons

### 6a. `ConstellationCanvas.web.tsx`

Web-only (RN Web) uses `react-native-svg`. On native the `.tsx` fallback renders a placeholder — Phase 1 pilot is web-first per `Context.md`.

Component shape:
```tsx
type Props = {
  nodes: GraphNode[];
  edges: GraphEdge[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  brtOverrides?: Record<string, BRT>;
  onSetBRT?: (nodeId: string, brt: BRT) => void;
  ambient?: boolean;                       // dark treatment
};
```

Render order (bottom→top): background rings → halos → edges (`<Path/>` per edge) → nodes grouped by type → selection ring → sprouted labels for selected node.

Labels: use `react-native-svg`'s `<SvgText>` — **not** HTML `<foreignObject>`. `foreignObject` in the design doc was a workaround for the DC framework's interpolation only. In `react-native-svg` on web, `<Text>` works natively; on native it renders too. This is the single most important RN‑Web gotcha for this feature.

Pan/zoom: wrap the drawn `<G/>` in a transform group; use `react-native-gesture-handler`'s `PanGestureHandler` + `PinchGestureHandler` (already a transitive dep of `react-native-svg` demos). Or Phase 1: static graph, no pan/zoom — matches the concept doc's static frames. Recommend shipping static first, adding pan/zoom behind a follow-up PR.

### 6b. `BRTPicker.tsx`

Standalone so Echo can adopt it later. Signature:
```tsx
type Props = {
  value?: BRT;
  onChange: (v: BRT) => void;
  size?: 'sm' | 'md';
  disabled?: boolean;
};
```
Three horizontal `Pressable`s. Colored border + tint when active. Icons: placeholder SVG glyphs (leaf / rosette / triangle) inline — swap when logos land. Reference the concept 1d markup for exact spacing.

### 6c. Inspectors

All extend `InspectorFrame` (header with kind label, title, close button, footer actions). Node-type body:
- `GoalInspector`: stats trio (Streak / Vault / Edges), connected reflections list, future-self card if `node.futureId`.
- `ReflectionInspector`: `<BRTPicker/>` bound to `onSetBRT`, valence history bar (7 fixed-width segments), contributing Echo excerpts. **The Echo excerpts must go through a new selector `useEchoEntriesForCandidate(nodeId)`** — until Section 7 vector retrieval lights up, this returns hard-coded excerpts from `data.mock.ts`.
- `AmbitionInspector`, `TensionInspector`, `FutureSelfInspector`: content per concept 1a legend + spec Section 2b. Keep short — 3–5 fields each.

Right drawer positioning: `position: absolute; right: 0; top: 0; height: 100%; width: 360`. Do not add a modal wrapper; direct-manipulation edits and RN Web's a11y both play badly with modals over the canvas.

### 6d. `ConstellationEmptyState.tsx`

Ports concept 1e verbatim. Uses:
- Existing `ConstellationSample` component (the seed SVG teaser) — swap the current whole-page composition for the seed-node-centered version from 1e.
- Two `<ProgressRing/>` or a linear bar; the current placeholder uses bars — keep bars for continuity.
- `<Button/>` variants: "Set a goal" (primary green), "Write an Echo" (secondary card).

---

## 7. RN‑Web gotchas (read before writing code)

1. **Never use HTML `<foreignObject>`, `<div>`, or inline CSS classes in the canvas.** All shapes and labels go through `react-native-svg` components. The concept HTML uses foreignObject only because the design-doc framework's `{{ hole }}` interpolation injects a `<span>` illegal inside SVG `<text>`. `react-native-svg` doesn't have that constraint.
2. **Fonts**: `react-native-svg` `<Text fontFamily="Inter-SemiBold" />`. Use the exact loaded font names — they're already loaded via `expo-font` in `app/_layout.tsx`. Look them up there before you write font strings.
3. **Gradients**: `<Defs><LinearGradient id="edge-mix">…</LinearGradient></Defs>` — use `stroke="url(#edge-mix)"` on `<Path/>`. This works on web; on native it works but gradient references must be unique per instance.
4. **Pointer events**: use `onPress` on wrapper `<G/>` groups, not `onClick`. `react-native-svg` on web maps `onPress` to click.
5. **NativeWind** doesn't style SVG elements — pass style props explicitly. All svg node/edge props are inline. This is the ONE place in the codebase where inline props are canonical.
6. **Absolute positioning of the inspector**: the parent stack screen already has `contentStyle: { backgroundColor: colors.background.page }` and no header. Put the canvas + inspector in a single `View style={{flex:1,flexDirection:'row'}}` — inspector as a fixed-width right column when open, canvas takes the rest. Do NOT use `position:absolute` for the inspector on native.
7. **Do not use `scrollIntoView`** — see project rules.
8. **BrandIcon 'constellation'**: the Sidebar file expects `icon?: BrandIconName` — the constellation nav item currently has no icon. If you want the sidebar icon from the concept (five dots + spokes), add a `constellation` case to `components/ui/BrandIcon.tsx` and reference it in `NAV_ITEMS` in `Sidebar.tsx`. Non-blocking — the sidebar already renders text-only fine.

---

## 8. PR breakdown (recommended)

Each PR is independently mergeable. Follow this order to keep diffs small and avoid touching other lanes twice.

**PR 1 — Foundations (no visual change yet)**
- Add `components/constellation/types.ts`, `tokens.ts`, `graph.ts`, `data.mock.ts`.
- Add store slice fields (§5).
- No consumer wiring yet.
- `tsc --noEmit` must be clean.
- Changelog: `### Added — Constellation view scaffolding (types, tokens, mock data)`.

**PR 2 — Empty state**
- Add `ConstellationEmptyState.tsx`.
- Rewrite `app/(app)/constellation.tsx` gate logic to render it below the threshold; keep the existing above-threshold placeholder intact for one more PR.
- Screenshot-diff against concept 1e.
- Changelog: `### Changed — Constellation empty state matches concept 1e`.

**PR 3 — Static canvas (1a)**
- Add `ConstellationCanvas.web.tsx` with **no pan/zoom**, **no inspector** yet. Renders all node types + edges + halos + legend + zoom control chrome (non-functional).
- Wire above-threshold branch of `constellation.tsx` to render the canvas with `data.mock.ts`.
- Concept 1a acceptance: all 24 mock nodes visible, all 30 mock edges drawn with correct valence colors, sprouted callout on the initially-selected goal.
- Changelog: `### Added — Constellation graph canvas (static, mock data)`.

**PR 4 — Inspectors + selection**
- Add `InspectorFrame`, all five inspectors, `BRTPicker`, `NodeSprout`.
- Selection now updates `constellationSelectedId` in the store; canvas reads it, draws the selection ring, sprouts the goal name callout.
- Reflection BRT edit is local-only for now (mock override map — no API).
- Concept 1c/1d acceptance: click any goal → GoalInspector; click any reflection → ReflectionInspector with functional BRTPicker.
- Changelog: `### Added — Constellation inspectors + BRT picker`.

**PR 5 — Dark / ambient treatment (1b)**
- Threading through `graphTokens(DARK_THEME)` and enabling ambient background gradient + starfield only when `themeMode === 'dark' || constellationAmbient`.
- Concept 1b acceptance: toggling theme swaps the canvas cleanly with no layout shift.
- Changelog: `### Changed — Constellation supports dark/ambient palette`.

**PR 6 (optional, follow-up) — Pan/zoom + manual link drafting**
- Adds `react-native-gesture-handler` transforms.
- Adds the "Connect" mode from the prototype (`Constellation Prototype.dc.html`).
- Manual edges land in a store array (still no API) — persist deferred.

**PR 7 (CTO lane) — Persistence**
- Migration 012 per spec Section 2 tables.
- `lib/db/constellation.ts` + `app/api/constellation/*`.
- Swap `data.mock.ts` for the real fetch — one import change in `constellation.tsx`.

---

## 9. Acceptance checklist per concept

Anchored to the concept file so a reviewer can flip between the tab and the running app.

**1a — Main canvas · restrained**
- [ ] Warm cream page bg, no gradients on light theme.
- [ ] Season node centered, deepest color; 3 ambition pills; 8 goal diamonds; 7 reflection circles with BRT dots; 2 trait hexagons; 2 tension Venns; 3 future-self dashed circles.
- [ ] Edges: positive solid green, mixed gradient, contradictory dashed red, future dashed teal, season low-opacity gray.
- [ ] Halos behind 5 named clusters (bud/rose/thorn/teal ×2).
- [ ] Legend bottom-left, zoom control bottom-right, "Hold ⌥ + drag" hint bottom-center. Hint copy configurable.
- [ ] Selected goal shows sprouted callout to the right.

**1b — Main canvas · atmospheric**
- [ ] Reuses same node data; ONLY visual token swap.
- [ ] Radial background emerald→black; faint dot grain overlay; concentric orbital rings visible.
- [ ] Legend and zoom get frosted-dark treatment (`rgba(14,23,18,.72)` backdrop, blur 8px).

**1c — Goal inspector**
- [ ] Right drawer, 360px on desktop web, 100% on narrow.
- [ ] Kind label "GOAL · {ambition}", 20px semibold title.
- [ ] Streak / Vault / Edges stat trio; connected reflections with BRT dots; future-self card if `futureId`.
- [ ] "Open in vault" secondary button, "＋ Draft link" primary button.

**1d — Reflection inspector**
- [ ] Italic "quoted" title, 18px.
- [ ] BRTPicker: three horizontal cards; active card has 2px colored border + tinted background + weight bump.
- [ ] Valence history bar with 7 fixed-percent segments in the exact order thorn→rose→bud from the concept.
- [ ] Three Echo excerpts, thorn variant uses `feedback.danger.bg`/`border`/`text`.

**1e — Empty state**
- [ ] Single Season seed node, halo, ghost-outline future nodes at ~22% opacity around it.
- [ ] Overlay card top-right with the "quiet map" copy verbatim from 1e.
- [ ] Two gate bars (`goalCount / 3`, `echoCount / 10`) — currently in `constellation.tsx`, keep the same data source.
- [ ] "You're one node so far. That's enough to begin." italic caption bottom.

---

## 10. Copy strings (freeze these)

Extract into `components/constellation/copy.ts` so product can edit without touching layout:

```ts
export const CONSTELLATION_COPY = {
  emptyHeadline: "A quiet map of who you're becoming.",
  emptyBody: "Nodes here aren't clicked into being — they emerge from goals you set and reflections you keep. Ohara withholds a node until the pattern is real.",
  emptyGateGoals: 'Set 3 goals',
  emptyGateEchoes: 'Write 10 Echoes',
  emptyFooter: "You're one node so far. That's enough to begin.",
  connectHint: 'Hold ⌥ + drag from any node to draft a link',
  connectHintActive: 'Now click a target node to draft the link…',
  legendTitle: 'Legend',
  legendValence: 'Edge valence',
};
```

---

## 11. Changelog stub

Per `AGENTS.md`, add to `CHANGELOGCODEX.md` under `## [Unreleased]`:

```
### Added
- Constellation view scaffolding: view types, graph tokens, mock data, UI store slice.
- ConstellationCanvas.web.tsx renders spec Section 2 node taxonomy against mock data.
- Inspectors for Season / Ambition / Goal / Reflection / Trait / Tension / Future-self.
- BRTPicker component (Bud / Rose / Thorn) with placeholder glyphs pending logo delivery.

### Changed
- app/(app)/constellation.tsx: full rewrite. Gate logic (goalCount ≥ 3 && echoCount ≥ 10) preserved; empty-state matches concept 1e, above-threshold branch renders new canvas.

### Deferred
- Migration 012 (nodes/edges tables) — CTO lane.
- lib/db/constellation.ts + app/api/constellation/* — CTO lane.
- Candidate extraction wiring — Ariel lane, per spec Section 3.
```

---

## 12. Questions to resolve before starting

1. **Sidebar icon**: do we add a `constellation` glyph to `BrandIcon` this PR, or keep the sidebar text-only?
2. **BRT logos**: are placeholder SVG glyphs acceptable in production for the pilot, or must we wait for finals? (Recommend: ship placeholders, they're indistinguishable at 18px.)
3. **Ambient / dark**: light users get concept 1a only unless they flip theme, correct? Or do we want a light-mode "atmosphere toggle" in the UI?
4. **Manual edges persistence**: PR 6 stores in memory. Do we need Supabase persistence before pilot, or after?
5. **Pan/zoom**: static Phase 1 vs interactive from day one — the spec Section 9 says interactive is deferred to Phase 2. Recommend static.

Reply on the doc, then start PR 1.
