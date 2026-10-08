# Calendar EventKit device validation

This checklist is the release gate for Calendar native behavior. Run it on a physical iPhone when possible, or a working iOS simulator with seeded Calendar data. Use synthetic titles only; do not capture private event content.

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
