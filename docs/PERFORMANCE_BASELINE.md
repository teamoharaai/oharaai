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
