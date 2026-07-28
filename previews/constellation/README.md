# Constellation renderer preview

This Expo Router app root exists only for internal development and screenshot QA.
It is outside the production `app/` route tree and is the only browser route that
imports the renderer and inspector fixtures.

Run:

```sh
npm run preview:constellation
```

Use both fixed query parameters for repeatable screenshots:

| Preview | Query | Viewport |
|---|---|---:|
| restrained light canvas | `/?appearance=light&state=canvas` | 1180 × 760 |
| atmospheric dark canvas | `/?appearance=dark&state=canvas` | 1180 × 760 |
| Goal inspector | `/?appearance=light&state=goal` | 1180 × 760 |
| Reflection inspector | `/?appearance=light&state=reflection` | 1180 × 760 |
| empty state | `/?appearance=light&state=empty` | 960 × 640 |

Capture at 1× browser scale after fonts finish loading. `appearance` accepts only
`light` or `dark`; an absent or invalid value resolves to `light`. `state` accepts
only `canvas`, `goal`, `reflection`, or `empty`; an absent or invalid value resolves
to `canvas`. Appearance is independent of state, so dark inspector and empty-state
coverage can be requested without adding another fixture.

The inspector captures intentionally use 1180 × 760 instead of the historical
820 × 720 frame so the current responsive production inspector remains beside the
graph. Production's narrow replacement behavior is unchanged.

The source images, their original frame sizes, immutable digests, and intentional
prototype deviations are recorded in
[`docs/constellation/REFERENCE_CONCEPTS.md`](../../docs/constellation/REFERENCE_CONCEPTS.md).
Node selection and pan/zoom are functional. Filters, Timeline, Season Archive,
Draft Link, and arbitrary edge-authoring controls remain intentionally absent.

## Automated acceptance

The Playwright suite uses this preview in two deliberately separate ways:

- the root route captures the five deterministic concept states without API
  access or product mutations;
- `/constellation` mounts the real production screen while Playwright intercepts
  its authenticated, owner-scoped API boundary with deterministic responses.

Run the committed visual and interaction baselines with:

```sh
npm run test:constellation:acceptance
```

Deliberately accept reviewed visual changes with:

```sh
npm run test:constellation:acceptance:update
```

Every concept is compared at its canonical desktop capture size, `768 × 1024`
tablet, and `390 × 844` narrow viewport. The suite also exercises Focus and URL
selection, inspector dismissal, annotation lifecycle, Echo search, the existing
goal-specific Bud/Rose/Thorn picker, evidence linking/editing/unlinking, retry
states, and empty-state navigation. Any browser console error, uncaught page
error, or React warning fails the owning test.

The API interception and preview session exist only under
`previews/constellation/` and `tests/constellation/`; production code retains
real-data-only behavior and never imports these fixtures.
