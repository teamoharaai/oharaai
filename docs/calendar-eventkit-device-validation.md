# Calendar EventKit device validation

This checklist is the release gate for Calendar native behavior. Run it on a physical iPhone when possible, or a working iOS simulator with seeded Calendar data. Use synthetic titles only; do not capture private event content.

## CEO validation sequence

Complete and record all 20 items before this branch is considered production-ready:

1. Install and launch the full Xcode application, not only Command Line Tools.
2. Open the generated OHARA iOS project/workspace in Xcode and build a fresh native binary with the `expo-calendar` config plugin applied.
3. Prefer a physical iPhone; use a functioning iOS simulator only when a physical device is unavailable.
4. Confirm Calendar permission is requested only after tapping **Connect Apple Calendar**.
5. Deny permission and confirm OHARA Calendar items remain usable without an automatic re-prompt.
6. Grant full permission and confirm the connected state refreshes correctly.
7. Confirm EventKit enumerates real calendars available on the device.
8. Select multiple calendars and confirm their selection persists for this signed-in user on this device.
9. If available, confirm a Google-backed calendar exposed through EventKit can be selected and read.
10. Confirm external reads remain bounded to the requested visible date range.
11. Exercise Today, Week, and Month and confirm each reads only its intended range.
12. Add one OHARA Task occurrence to a chosen writable Apple calendar.
13. Add one OHARA Milestone to a chosen writable Apple calendar.
14. Add one OHARA Goal deadline to a chosen writable Apple calendar.
15. Repeat each export action and confirm the existing link prevents a duplicate Apple event.
16. Delete an exported Apple event externally and confirm OHARA marks the link missing and permits an explicit re-export without changing the canonical OHARA item.
17. Revoke permission in iOS Settings, foreground OHARA, and confirm external items clear while OHARA items remain available.
18. Disconnect and reconnect; confirm reads stop while disconnected, local selection clears, Apple events remain, and reconnect can restore a valid selection.
19. Validate timed, all-day, timezone, and `America/New_York` DST-boundary events on the intended local date/time.
20. Background and foreground OHARA after permission, calendar-name, and selection changes; confirm the provider refreshes and removes stale calendar identifiers.

These are unverified acceptance steps, not recorded pass results. Capture only synthetic evidence and report any failure before merge, migration, or deployment.

## Build and setup

- Build a fresh native binary/TestFlight build after installing `expo-calendar` and applying the config plugin.
- Create at least two writable calendars (for example `OHARA Test Personal` and `OHARA Test Work`) and one unselected calendar.
- When available, include one Google-backed calendar exposed through EventKit.
- Seed a timed event, an all-day event, and events around a DST transition in `America/New_York`.
- Seed Project Alpha with the Arthur/Justin/Maya Task and Milestone matrix from the phase specification.

## Permission and connection

1. Confirm login, onboarding, Home mount, and Calendar mount do not show a native permission prompt.
2. Capture the disconnected **Connect Apple Calendar** state.
3. Tap Connect and capture the native permission state.
4. Deny access. Confirm OHARA items still render and reopening Calendar does not re-prompt.
5. Grant full access in iOS Settings, foreground OHARA, and confirm calendars refresh.
6. Revoke access, foreground OHARA, and confirm provider items clear while OHARA remains usable.
7. Where the runtime exposes restricted or write-only access, confirm OHARA treats it as disconnected/denied rather than claiming readable access.

## Calendar selection and bounded reads

1. Confirm EventKit calendar enumeration includes the synthetic calendars and the Google-backed calendar when configured.
2. Select two calendars, leave one unchecked, save, and relaunch.
3. Confirm the selection persists only for the signed-in user on that device.
4. Confirm Today reads one day, Week reads seven days, Month reads only its visible grid, and Home reads the current week.
5. Rename and delete selected calendars, foreground OHARA, and confirm stale identifiers are removed without affecting OHARA items.
6. Confirm timed, all-day, timezone, and DST-boundary events remain on the intended local date/time.

## Project relevance and privacy

1. Verify creator, assignee, and responsible-member inclusion in Calendar → Projects.
2. Verify an unrelated Project member sees none of the synthetic item.
3. Verify creator-equals-assignee/responsible renders one canonical item.
4. Verify a removed member immediately loses Project Calendar visibility.
5. Verify external Apple event titles never appear to another OHARA user, Project member, Circles, Project Snapshot, or Project Activity.

## Explicit export and failure isolation

1. Export one Task occurrence, one Milestone, and one Goal deadline to a chosen writable calendar.
2. Tap Add again and confirm the already-linked state appears without another Apple event.
3. Delete the Apple event externally, return to OHARA, and confirm the link becomes missing and can be exported again.
4. Edit the Apple event externally and confirm the canonical OHARA date does not change.
5. Simulate provider read/write failure and confirm OHARA-native Calendar remains available.
6. Disconnect and confirm reads stop, local selection clears, Apple events remain, and OHARA entities remain.

## Required synthetic screenshots

Capture: Connect, permission, calendar selection, mixed Apple/OHARA view, Projects filter, creator item, assigned item, unrelated item absent, Add to Calendar, already linked, denied, and disconnected.
