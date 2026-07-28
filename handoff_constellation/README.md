# Constellation Handoff Package

Everything a Codex / Claude Code session needs to implement the Constellation feature in the `oharaai` repo without touching adjacent lanes.

## Contents

- `CONSTELLATION_HANDOFF.md` — the implementation plan. Read this first, top to bottom. It maps every screen (1a–1e) to concrete files, types, tokens, and PRs.
- `concepts/` — 2× resolution PNGs of the five design concepts. Treat these as the pixel spec.
  - `1a-canvas-restrained.png` — main canvas, warm theme
  - `1b-canvas-atmospheric.png` — main canvas, dark theme
  - `1c-goal-inspector.png` — goal detail drawer
  - `1d-reflection-inspector.png` — reflection detail drawer with BRT picker
  - `1e-empty-state.png` — pre-threshold onboarding
- `reference/Constellation Concepts.dc.html` — the original design source. Read it to inspect exact CSS values (colors, spacing, font sizes) that were used in the mockups. It will NOT render standalone in a browser — the runtime it targets is not included.

## How to use

1. Drop this folder into the `oharaai` repo. Suggested location: `docs/constellation/`.
2. Point your engineer / Codex at `docs/constellation/CONSTELLATION_HANDOFF.md`.
3. Answer the 5 open questions at the bottom of that file before PR 1 starts.
4. Ship PRs 1–5 in order. PR 6 (pan/zoom + manual link drafting) is optional for the pilot.
5. PR 7 (schema + API) is owned by the CTO lane per `AGENTS.md`.

## Not included (out of scope)

- Migration `012_constellation_nodes_edges.sql` — spec Section 2, CTO lane.
- Candidate extraction wiring — spec Section 3, Ariel lane.
- Vector infrastructure — spec Section 7 + `constellation_conv3_block_summary.md`.
