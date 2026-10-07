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

The Calendar UI consumes normalized `CalendarItem` values regardless of provider. The Apple implementation uses `expo-calendar` / EventKit on device. It asks for full calendar access only after the user selects Connect, reads only the visible range, and degrades independently when unavailable or denied. Exporting an OHARA item is an explicit user action; OHARA remains canonical afterward.

No external-link table is needed for the current display and one-way export behavior. Add a provider-neutral `calendar_external_links` migration only when durable sync identity is implemented.

## Future Google Calendar flow

Google Calendar is not implemented in this phase. The intended flow is:

1. Connect Google Calendar from Calendar settings.
2. Complete calendar-specific OAuth consent, separate from application sign-in.
3. Choose calendars.
4. Perform a bounded initial sync.
5. Store provider-neutral external links and the provider sync token.
6. Continue with incremental sync and push notifications where appropriate.

Google authentication and permission to read Google Calendar must remain separate consent decisions. There is no nonfunctional Google connection control in the current UI.

## Cache coordination

Calendar requests are range-keyed and bounded to at most 63 days. Home asks only for the current week; the dedicated workspace asks for the visible day, week, or month. Domain writes should invalidate only affected date ranges when shared caching is introduced; Calendar does not replace the app's global fetch/cache layer.
