# Tracker Metrics — Audits

Point-in-time verification reports. Create one when a task hits an acceptance
gate or when you verify live state (DB index, migration history, null-frequency
row counts, security review).

Naming: `NNN-<subject>.md`, e.g. `001-migration-046-live-verify.md`,
`002-null-frequency-inventory.md`, `010-release-gate.md`.

Each audit should record:

- **Date, task, and who/what ran it.**
- **What was checked** (exact query / command / EXPLAIN plan).
- **Raw evidence** (paste output — `pg_indexes` rows, EXPLAIN, test counts).
- **Verdict**: pass / fail / needs follow-up, with links to `OUTSTANDING.md`.

No audits recorded yet — implementation has not started (see
`changelog/000-preflight-review.md`).
