# Constellation Release Certification — 2026-07-28

## Decision

**PASS with non-blocking follow-ups.**

The deployable source passed Constellation functional, security, privacy,
responsive, visual, export, and rollback checks. The controlled live smoke
created two temporary Supabase users, exercised real owner-scoped data and API
paths, deleted both auth users, and verified zero residual rows in every table
it touched.

This decision certifies the current rollout contract. The
`CONSTELLATION_ENABLED` rollback disables and guards the sidebar action and
produces a valid disabled build; it is not a server-side API or direct-route
kill switch.

## Certified source and environments

- Source baseline: `d2367de` (`main`) plus the certification-only loading-state
  acceptance coverage and this report.
- Database: configured linked Supabase project, accessed only through a
  controlled two-user smoke with account-cascade cleanup.
- Browser: deterministic isolated Expo preview plus the production
  Constellation screen and client state; no production fixture import or
  fallback was introduced.
- Build: Expo SDK 55 server-rendered web export.
- No deployment, dependency upgrade, migration, schema change, or permanent
  release-account data was created.

## Release gates

| Gate | Result | Evidence |
|---|---|---|
| Strict TypeScript | PASS | `npx tsc --noEmit` exited 0 before certification and again after restoring Expo's full generated route types. |
| Constellation tests | PASS | `npm run test:constellation`: 66 passed, 0 failed. |
| Database security | PASS | Disposable PostgreSQL migration-032 harness passed every constraint, forged-owner, cross-user RLS, archival, evidence, and deletion assertion, then removed its temporary cluster. |
| Browser acceptance | PASS | 22 Playwright journeys passed, including the explicit initial-loading check added during certification. |
| Visual regression | PASS | All 15 committed desktop/tablet/narrow screenshots matched within the configured 0.8% pixel threshold. |
| Manual visual acceptance | PASS | In-app inspection confirmed atmospheric desktop canvas, narrow Goal inspector replacement, and desktop Reflection Focus layout with real-valence evidence presentation. |
| Web export | PASS | Enabled export completed with 42 API routes, including all nine Constellation API routes. |
| Feature-flag rollback | PASS, scoped | A temporary `CONSTELLATION_ENABLED=false` build exported successfully; the sidebar rendered the item disabled and guarded navigation. The flag was restored to `true` byte-for-byte afterward. |
| Diff hygiene | PASS | Generated export directories, preview route-type changes, browser tabs/server, temporary certification script, and test accounts were cleaned before handoff. |

## Controlled live account evidence

The smoke generated a random run ID and two confirmed test users: one qualified
owner and one cross-user adversary. It created only run-scoped rows:

- owner: 3 active Goals, 10 private Echoes, one Goal node, one Reflection node,
  two annotations, and three manual evidence links;
- evidence: exactly one Bud, one Rose, and one Thorn link for the selected Goal;
- Reflection profile candidate: two owned Echo sources and two real valence
  history events;
- adversary: one private Goal, Echo, and Goal node used only for isolation
  checks.

Positive API results:

- graph returned `version: 1.0`, `dataOrigin: real`,
  `accessEligible: true`, and `renderState: graph`;
- graph source counts were 3 Goals and 10 Echoes, with 3 earned nodes including
  the derived Season anchor;
- Goal inspector returned all 3 Bud/Rose/Thorn evidence items;
- Reflection inspector returned 2 bounded owned Echo excerpts and 2 valence
  events;
- annotation flow created Note and Projection drafts, edited the Note, archived
  the Projection, and returned the stable conflict contract for a later edit.

Privacy and RLS results:

- the adversary read zero owner rows from `goals`, `echo_entries`,
  `constellation_nodes`, `constellation_annotations`, and
  `constellation_evidence_links`;
- cross-user Goal and Reflection inspectors returned stable `NOT_FOUND`
  envelopes without owner data;
- a forged owner annotation failed;
- an authenticated attempt to create a system-managed earned node failed.

Cleanup proof:

- both temporary auth users were deleted;
- post-delete residual counts were zero for `profiles`, `goals`,
  `echo_entries`, `constellation_nodes`, `constellation_annotations`, and
  `constellation_evidence_links`.

## API and state contracts

| Contract | Result |
|---|---|
| Unauthenticated request | `401 UNAUTHORIZED` stable envelope |
| Invalid JSON/input | `400 INVALID_INPUT` stable envelope |
| Cross-user or missing resource | `404 NOT_FOUND` stable envelope |
| Archived annotation edit | `409 CONFLICT` stable envelope |
| Internal database prose exposure | Rejected by focused server tests |
| Initial loading | Delayed graph response visibly exposes `Loading Constellation` before the canvas |
| Retry | Graph, Goal evidence, Reflection, and Echo search fail once and recover through visible retry actions |
| Empty/locked | Set a goal and Write an Echo CTAs render and navigate to real product destinations |
| Refresh/stale data | Focused state tests retain retryable last-known data and discard it on non-retryable owner failures |

## Responsive and visual review

- Canonical desktop, `768 × 1024` tablet, and `390 × 844` narrow baselines
  passed for restrained canvas, atmospheric canvas, Goal inspector, Reflection
  inspector, and empty state.
- Narrow Goal inspection replaced the canvas with one full-width, scrollable
  inspector and a visible Back action.
- Desktop Reflection Focus retained the graph/inspector split, bounded
  contributing Echo cards, and real valence history.
- The acceptance console gate found no uncaught page errors, React warnings, or
  disallowed browser warnings. Two known pre-existing module require-cycle
  warnings remain allowlisted and are listed below.

## Expo compatibility review

`npx expo-doctor` ran with registry access: **16 of 19 checks passed**. No broad
upgrade was applied during certification.

Non-blocking patch-level SDK 55 mismatches:

| Package | Installed | Expo expected |
|---|---:|---:|
| `expo` | 55.0.8 | ~55.0.28 |
| `expo-constants` | 55.0.9 | ~55.0.17 |
| `expo-font` | 55.0.4 | ~55.0.8 |
| `expo-image-picker` | 55.0.21 | ~55.0.22 |
| `expo-linear-gradient` | 55.0.10 | ~55.0.16 |
| `expo-linking` | 55.0.8 | ~55.0.16 |
| `expo-router` | 55.0.7 | ~55.0.17 |
| `expo-splash-screen` | 55.0.12 | ~55.0.23 |
| `expo-status-bar` | 55.0.4 | ~55.0.6 |
| `react-native` | 0.83.2 | 0.83.10 |
| `react-native-worklets` | 0.7.2 | 0.7.4 |

Other Doctor findings:

- `.expo/` is ignored by `.gitignore`, but four historical `.expo` files are
  already tracked; clean this in a separately reviewed repository-hygiene
  change.
- Doctor reported that dynamic `app.config.js` does not consume `app.json`.
  Runtime evaluation disproved the warning: the config imports `app.json` and
  returned the expected name, slug, server web output, and plugin list. Treat
  this as a static-analysis false positive unless Expo changes its detection.

Observed non-blocking development warnings:

- two existing `lib/api/client.ts` require cycles through Echo and Friends store
  clearing;
- the full app development server emitted one React Native Web `shadow*`
  deprecation warning outside the isolated Constellation acceptance surface.

These warnings did not affect TypeScript, the 66 focused tests, the 22 browser
journeys, either web export, or the live RLS/API smoke. They should be handled
as scoped follow-ups rather than mixed into this release certification.

## Follow-ups

1. Schedule a patch-only Expo SDK 55 compatibility update and rerun this full
   matrix; do not combine it with a major SDK or architecture upgrade.
2. Remove historically tracked `.expo` files in a dedicated hygiene change.
3. Remove the two require cycles and the remaining web shadow deprecation.
4. If operations require an emergency server-side kill switch, add a separately
   designed API/direct-route guard; the existing flag is intentionally only a
   product-surface rollout control.
