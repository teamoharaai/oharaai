# Performance baseline diagnostics

Dashboard and Entries load diagnostics are enabled automatically in development. To enable them in a production-like web build, set `EXPO_PUBLIC_PERF_DIAGNOSTICS=true` before starting or exporting Expo.

The console emits one `[performance]` object per completed operation. Each object contains only an operation name, rounded duration in milliseconds, success status, and safe aggregate counts; data-load records also include the load phase (`initial-load` or `refresh`). Entries reports its entry and container counts separately. It never includes entry text, user identifiers, emails, tokens, URLs, or error payloads.

The request count is a scoped count of explicitly started auth/service reads in that load path. It intentionally does not intercept global `fetch` and is not a replacement for network tracing.

Key operation names:

- `root.session-bootstrap` and `root.font-bootstrap`
- `goals.load` and `goals.enrichment`
- `dashboard.active-goal-reflections` and `dashboard.primary-content-ready`
- `projects.load`
- `entries.load` and `entries.screen-ready`

## 2026-07-30 production web export baseline

Measured with `npx expo export --platform web --output-dir <temporary-directory>` on 2026-07-30. Sizes are uncompressed emitted-file bytes unless noted; source maps are excluded.

- Client JavaScript: 3,593,281 bytes (3.43 MiB) raw; 884,544 bytes (864 KiB) gzip (`gzip -9`).
- Client assets: 12,689,521 bytes (12.10 MiB) under `client/assets`; the complete client deliverable including JavaScript, CSS, and favicon is 16,314,319 bytes (15.56 MiB).
- Google-font assets: 7,313,988 bytes (6.98 MiB), including exported Inter and Lora font files.
- Vector-icon assets: 4,076,840 bytes (3.89 MiB), including exported `@expo/vector-icons` font files.
- Metro client module count: 1,604 (`Web Bundled`); server rendering reported 1,603 modules separately.

## 2026-07-30 P0 dashboard goal-load optimization

- Full enriched goal pipelines initiated by a dashboard mount: reduced from 2 to 1.
- Supplemental Today's Focus reads: reduced from an auth read plus a second enriched goal
  load and reflection read to 1 reflection-timestamp read scoped to active goal IDs.
- `dashboard.primary-content-ready` no longer waits for the optional reflection-timestamp
  read; `dashboard.active-goal-reflections` reports that read separately with
  `requestCount: 1`.
- No authenticated runtime timing sample was recorded in this local validation session.

## 2026-09-18 Home load: de-waterfall + SWR aggregator (Stages 1–3)

Reworked how Home (`/dashboard` — Today's Focus + Next Step) loads its
goal-derived data. See the "Home Data Flow" rule in CLAUDE.md for the seams.

- **Stage 1 — de-waterfall + SWR.** `fetchGoals` runs
  `reconcile_goal_expiration_v1` fire-and-forget instead of awaiting it before
  the goals `SELECT` (self-healing maintenance write, off the read path).
  `useGoals` became stale-while-revalidate over the goal store (instant cached
  paint on return-nav, background refresh, in-flight dedup, `userId`-keyed).
- **Stage 2 — Home aggregator.** The two goal-signal reads (reflection
  timestamps + this-week canonical Task counts) that previously waterfalled
  *after* the client goal load are now one `GET /api/home/summary`, computed
  server-side in parallel and fired on mount independent of the goal load, behind
  the SWR-cached `useHomeSummary`. Retired the separate
  `dashboard.active-goal-reflections` client read and the
  `/api/goals/weekly-task-counts` route.
- **Stage 3 — extraction.** Panels moved to
  `features/goals/components/home/`; `dashboard.tsx` 644 → 266 lines.

### Benchmark — server round-trip critical path

Live medians against Supabase (9 runs, 2 warmups) for the account with the most
active goals (6). Harness measured each Home query's real round-trip, then
composed the OLD vs NEW critical path.

Per-query round-trip (ms): baseline hop 209 · goals+milestones+trackers 263 ·
reflection 125 · timezone+weekly 245 · aggregator (tz→weekly ∥ reflection) 259.

| Scenario | OLD | NEW | Δ |
| --- | --- | --- | --- |
| Cold load — signals ready | 717 ms | 263 ms | −63% |
| Cold load — first paint (goals visible) | 472 ms | 263 ms | −44% |
| Return-nav to Home | 717 ms | ~0 ms (cached) | −100% |

OLD cold path was serial: `reconcile (≈209) → goals (263) → max(reflection 125,
weekly 245)`. NEW removes the reconcile hop and runs the aggregator in parallel
with the goals load, collapsing to `max(goals 263, aggregator 259)`.

Caveats: measures the server round-trip critical path (dominant cost), not React
render or the shared `auth.getUser` hop; enrichment (vault/echo/BRT) is unchanged
and paid by both paths, so excluded from the delta; the reconcile hop is proxied
by a single round-trip (it needs `auth.uid()`, so it isn't callable with the
service-role key — the real op is a cheap `UPDATE` ≈ one round-trip). Absolute ms
vary with network latency; the round-trip *depth* (serial → parallel) is what the
refactor changed and is machine-independent.
