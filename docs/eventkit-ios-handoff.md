# EventKit iOS validation handoff

## Status

- Code implemented on `feature/calendar-eventkit-ios-validation` from EventKit checkpoint `a0f4253947651556a833b3dc79b95dfdfa9fbebe`.
- Checkpoint parent/base: `e82091e3e734178e015464c214c1029cb9d6a77e` (`upstream/main` when the checkpoint was created).
- Automated tests passed: the focused Calendar/provider suite is 16/16, the production web export succeeds, and the production iOS JavaScript export succeeds.
- Tracked TypeScript comparison introduces no EventKit-branch diagnostics. The repository-wide command remains nonzero with the same pre-existing React Native web-style typings and `lib/goals/manual-create-v1.test.ts` URL typing diagnostic present at the checkpoint parent.
- Physical iOS validation is still required. No permission, multi-calendar, EventKit read/write, timezone/DST, or on-device privacy result is claimed by the automated checks.

Run every item in [`calendar-eventkit-device-validation.md`](./calendar-eventkit-device-validation.md) on a physical iPhone where possible, using only synthetic calendar data and screenshots.

## Migration and release gate

- Production migration ledger was read-only verified at `088` on 2026-10-08.
- Migration `089` exists on `upstream/main` but is pending in production.
- Migration `090_calendar_external_links.sql` exists only on this local/remote validation branch and has **not** been applied to production.
- Do **not** apply migration 090, merge this branch, or deploy this branch until physical iOS validation is complete and the normal migration ordering/release process has been re-verified.

This branch is a CEO/iOS validation handoff, not a production release.
