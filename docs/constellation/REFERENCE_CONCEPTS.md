# Constellation concept references

The five original `handoff_constellation` concept images are preserved as
documentation-only references at:

```text
docs/constellation/reference/5df3a3b/concepts/
```

The commit-addressed directory records their source,
`5df3a3bc7b0e4d471fcaa0d679615b9a46c2b96f`. The fixture-boundary suite pins the
exact filename set, PNG dimensions, and SHA-256 digest for every image. Replacing,
renaming, recompressing, or adding an image therefore requires an explicit test
change rather than silently rewriting the historical reference.

Production TypeScript must not import anything under
`docs/constellation/reference/`. The boundary suite scans all production source
roots for static, dynamic, side-effect, and CommonJS imports of this tree. These
images are comparison evidence, not application assets or runtime fallbacks.

## Original frames

The source HTML used the following CSS frame sizes. The committed PNGs are 2×
captures with a one-device-pixel card boundary on each edge.

| Concept | Reference | Source frame | PNG pixels |
|---|---|---:|---:|
| 1a restrained light canvas | [1a-canvas-restrained.png](reference/5df3a3b/concepts/1a-canvas-restrained.png) | 1180 × 760 | 2362 × 1522 |
| 1b atmospheric dark canvas | [1b-canvas-atmospheric.png](reference/5df3a3b/concepts/1b-canvas-atmospheric.png) | 1180 × 760 | 2362 × 1522 |
| 1c Goal inspector | [1c-goal-inspector.png](reference/5df3a3b/concepts/1c-goal-inspector.png) | 820 × 720 | 1642 × 1442 |
| 1d Reflection inspector | [1d-reflection-inspector.png](reference/5df3a3b/concepts/1d-reflection-inspector.png) | 820 × 720 | 1642 × 1442 |
| 1e empty state | [1e-empty-state.png](reference/5df3a3b/concepts/1e-empty-state.png) | 960 × 640 | 1922 × 1282 |

The current implementation's reproducible capture URLs and viewport sizes are
documented in [`previews/constellation/README.md`](../../previews/constellation/README.md).

## Intentional prototype deviations

The PNGs remain visual references, not a domain contract. The shipped model
intentionally differs in these ways:

- Prototype `Future self` circles are represented as user-authored
  `Projection · Draft` annotations. Notes are also explicit user-authored draft
  annotations. Neither kind is earned, system-validated, visibility-scored, or
  eligible for automatic promotion.
- Bud, Rose, and Thorn are goal-specific virtual clusters derived from the
  deduplicated union of confirmed goal-container Entries and owned evidence
  references. They are not earned Reflection nodes or persisted graph nodes.
  Classification belongs to the Entry's `echo_entries.brt_category`, so one
  Entry keeps the same category across its goal relationships. Empty categories
  produce no node, and every cluster remains weightless.
- Goal categories are live virtual symbol hubs. A hub appears only when the
  current graph contains a visible goal in that category.
- The Goal inspector reports live goal status, connected graph entities, and
  the authoritative distinct Entry count plus its three most recent attached
  or referenced Entries. The separate evidence-reference controls remain
  explicit. It does not invent streak or synthetic Vault statistics.
- The Reflection inspector is read-only and shows owner-verified occurrence,
  score, valence-history, and bounded contributing-Echo data. The prototype's
  local-only BRT picker is absent because Reflection classification cannot mutate
  goal-specific evidence or create a fake persisted override.
- Light appearance is the restrained 1a treatment; atmospheric gradients, grain,
  and halos are dark-only as in 1b. There is no ambient override in light mode.
- Timeline, Season Archive, Filter, Draft Link, and concept-only inactive chrome
  remain absent. Pan and zoom are functional in the current renderer, but no
  arbitrary node-to-node authoring was introduced.
- Every visible web node can be repositioned. Goal nodes act as planets and BRT
  summaries as parent-relative moons, so moving a goal carries its satellites.
  Owner-scoped positions persist through migration 034 and can be reset; layout
  never changes graph semantics.
- The legend is functional, collapsible, and persisted as a UI preference.
- Desktop inspectors use the production 360px side surface. Tablet and narrow
  viewports replace the graph with a full-width inspector instead of preserving
  the prototype's fixed 320px drawer. The preview therefore uses a wider canonical
  inspector capture viewport than the original 820 × 720 concept frame.
- Empty-state progress uses deterministic fixture counts in the preview and real
  owner counts in production. Production never fills an empty or failed response
  with the renderer fixture.
