# iOS API and ownership contract v1

This is the backend half of iOS beta Task 7. Versioned examples live in
`contracts/ios/v1`; `npm run test:ios-contract` verifies those fixtures and the
applicable migrations through the current latest migration, 046.

Every route below requires a Supabase bearer token verified with `auth.getUser`.
The server derives `userId`; clients never submit it. Responses send
`X-Request-ID` (a validated incoming ID or generated UUID) and
`Cache-Control: no-store`. Errors are
`{ok:false,data:null,error:{code,message},requestId}`. Diagnostics may contain only
event name, request ID, status, and a bounded provider code—never tokens,
passwords, emails, owner/record IDs, goal titles, Entry bodies/documents, or raw
database messages. The service-role key is read only by server modules and is
never part of the native contract.

| iOS operation | Success contract and write effect |
| --- | --- |
| `GET /api/momentum` | `{data: MomentumHomeSummary}`. Read boundary; trusted snapshot publication is server-only after auth. |
| `POST /api/goals` | 201 `{ok:true,data:{goalId,error:null,warning},error:null}`. Sequentially inserts one owned goal and its requested children. |
| `GET /api/actions?...` | `{items: ActionLog[]}`. Owner-filtered read only. |
| `PATCH /api/actions/:id` | `{item: ActionLog}`. Updates one owned action's absolute status/completion timestamp; non-owned and missing are both 404. |
| `POST /api/goals/complete-tracker` | `{success:true}` plus optional additive period state. Verifies goal/tracker ownership, then logs completion. |
| `GET /api/entries/library?type=reflection` | `{entries: EntryRecord[]}`. Reads the owner's non-archived reflections. |
| `POST /api/entries/library` | 201 `{entry: EntryRecord}`. `save_entry_v4` creates one owned reflection and relationships; owner-scoped `clientRequestId` makes retry idempotent. |

Status rules are fixed: 400 malformed JSON/query; 401 missing/invalid session; 403
authenticated forbidden; 404 owner-scoped missing; 409 conflict; 422 valid JSON
that fails semantic validation; 429 rate limit with `Retry-After` when available;
5xx transient internal/service failures. No response includes raw provider details.

RLS was traced through migrations 001, 006, 025, 036, 038–040, 044–046:
profiles and goals compare their owner to `auth.uid()`; trackers/logs traverse to
an owned goal; action logs require both row and linked-goal ownership; Entries and
relationship inserts require the owned Entry and linked owned goal/milestone;
`save_entry_v4` derives and scopes the owner; Momentum grants owner SELECT only and
reserves publisher functions for `service_role`. This is static migration/test
coverage, not a query of production `pg_policy`.

Known risks: goal creation is not transactional or idempotent; tracker completion
has no client request ID; and the separate uncommitted tracker-metrics Tasks 3–5
change period semantics and must be revalidated when committed. Do not merge those
working-tree changes into the Task 7 commit.
