# OHARA Calendar provider boundary

## Canonical ownership

OHARA Tasks, Task occurrences, Milestones, and Goal deadlines remain canonical in their existing tables. `CalendarItem` is a bounded read projection, not a second source of truth. A provider event never becomes an OHARA Task by identity, and an external edit never silently mutates OHARA work.

Shared Project calendar context is derived only from RLS-visible OHARA Goals and their canonical work. A user's connected personal calendars and events remain local and private; they are never exposed to Project members.

## Provider contract

`features/calendar/providers/types.ts` defines the intentionally narrow boundary:

- access state and explicit access request;
- calendar enumeration;
- bounded event reads;
- explicit create, update, and delete operations.

The Calendar UI consumes normalized `CalendarItem` values regardless of provider. The Apple implementation uses `expo-calendar` / EventKit on device. It asks for full calendar access only after the user selects Connect, reads only the selected calendars in the visible range, and degrades independently when unavailable or denied. Exporting an OHARA item is an explicit user action; OHARA remains canonical afterward.

The selected EventKit calendar identifiers are stored locally with `AsyncStorage`, namespaced to the signed-in OHARA user. External event content is never copied into Supabase. Disconnect clears the local selection and stops EventKit reads; it does not delete Apple events or OHARA entities.

## Durable export identity

Migration 090 adds an owner-private `calendar_external_links` table for explicit one-way exports. It records only the OHARA entity/occurrence identity, provider identifiers, and synchronization state. Authenticated clients receive SELECT access to their own RLS-visible rows; all writes go through narrowly authorized RPCs.

Export uses an expiring reservation key under an advisory lock. Concurrent taps for the same user/entity/provider either reuse an active link or return the existing in-flight reservation instead of creating a second EventKit event. Only the reservation owner can finalize the link. A five-minute stale reservation can be retried, so a crashed client cannot leave a permanent lock.

If the linked Apple event is later missing, OHARA marks the link `missing` and offers a new explicit export. Removing a link marks it `unlinked` and deliberately preserves the Apple event. Neither path mutates or deletes the canonical Task occurrence, Milestone, or Goal deadline.

## Relevance versus authorization

RLS defines the maximum set the viewer may read; the Calendar projection then applies a second relevance test. Direct OHARA schedule scope includes assigned Tasks, responsible Milestones, owned/led Goal deadlines, and legacy owner rows. Project scope additionally includes Project Tasks or Milestones the viewer created and delegated to someone else. Home uses only direct scope plus the viewer's selected external calendars; Calendar → Projects exposes the broader creator/assignment/responsibility union. Canonical IDs remove overlaps.

## iOS permission behavior

Expo Calendar 55 requests full EventKit access on iOS 17+. Its native permission requester maps restricted and write-only authorization to denied because neither permits the bounded reads promised by the connected state. OHARA never requests access on login, onboarding, Home mount, or Calendar mount. The request occurs only after the explicit **Connect Apple Calendar** action.

Changing `expo-calendar`, its config plugin, or the native usage description requires a new iOS native/TestFlight build. A Metro web export cannot validate EventKit behavior; the physical/simulator acceptance checklist lives in `docs/calendar-eventkit-device-validation.md`.

## Future Google Calendar flow

Google Calendar is not implemented in this phase. The intended flow is:

1. Connect Google Calendar from Calendar settings.
2. Complete calendar-specific OAuth consent, separate from application sign-in.
3. Choose calendars.
4. Perform a bounded initial sync.
5. Extend provider-neutral external links with the Google event identity and provider sync token.
6. Continue with incremental sync and push notifications where appropriate.

Google authentication and permission to read Google Calendar must remain separate consent decisions. There is no nonfunctional Google connection control in the current UI.

## Cache coordination

Calendar requests are range-keyed and bounded to at most 63 days. Home asks only for the current week; the dedicated workspace asks for the visible day, week, or month. Domain writes should invalidate only affected date ranges when shared caching is introduced; Calendar does not replace the app's global fetch/cache layer.
