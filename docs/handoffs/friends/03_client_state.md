# Session 3 — Friends Client State and Concurrency

## Recommended run

- Model: `gpt-5.6-sol`
- Reasoning effort: `xhigh`
- Use `max` only for a separate adversarial race-condition review.

## Prompt

You are implementing Session 3 of Ohara's Friends surface: client services,
state, and concurrency behavior only.

Work in `/Users/justin.villalta/oharaai`. Read `AGENTS.md`,
`CHANGELOGCODEX.md`, the completed Session 2 files and contract, and
`docs/handoffs/friends/02_api_data_layer.md` before editing. Session 2's actual
checked-in response types and route behavior are authoritative if they differ
from the planning prompt. Update `CHANGELOGCODEX.md` for every code change.

### Objective

Build the feature-owned client service wrappers, Zustand state, and controller
hook that the anchored Friends UI can consume safely. Do not build or modify UI
in this session.

Recommended locations:

- `features/friends/services/friends-service.ts`
- `features/friends/store.ts`
- `features/friends/hooks/useFriends.ts`
- `features/friends/types.ts` only where Session 2 did not already establish
  the shared types

Use `authedFetch` and the repository's `ApiResponse` unwrapping conventions.
Add the Friends store to the existing logout/account-change
`clearAllStores` path.

### Required state behavior

- Hold the server snapshot: accepted friends, count, incoming requests, and
  sent requests.
- Distinguish initial loading, hydrated, explicit refreshing, and load error.
- Initial hydration must be single-flight.
- An explicit refresh requested while hydration is in flight must queue or
  force one fresh request after the current request; it must not silently reuse
  a result that predates the refresh intent.
- Keep mutation busy/error state per connection or target profile, not in one
  global boolean.
- Accept, decline, and send operations must remain correct when different rows
  mutate concurrently.
- Optimistic updates must use entity-specific forward and inverse patches.
  Never roll back a failed mutation by restoring a whole captured store,
  because that can erase a later successful concurrent mutation.
- A successful send must use the real connection ID returned by Session 2,
  immediately update sent requests, and update matching search results to
  `pending_out`.
- A `pending_in` search result must be preserved so Session 4 can offer a
  Review action that switches to Requests.

### Search behavior

- Trim input and do not request prefixes shorter than 3 characters.
- Cap accepted input at the Session 2 contract's maximum, expected to be 20.
- Debounce requests by approximately 250 ms.
- Abort superseded requests where supported and also use a monotonically
  increasing request/version guard so a stale response can never overwrite a
  newer query.
- Keep search loading and search error separate from initial snapshot state.
- Clearing or shortening the query must immediately clear stale results and
  invalidate in-flight responses.

### Scope boundary

This session owns feature client services, state transitions, controller hooks,
logout/account reset integration, and pure state/concurrency tests. It does not
own API/schema changes, rendered components, AvatarMenu, anchored popovers,
theme styling, responsive design, or enabling the social flag.

If the checked-in API contract cannot safely support the state model, document
the exact contract defect and return it to Session 2 rather than silently
working around it. Route all client-state, cache, optimistic-update, search,
and race-condition follow-ups back to this session. Route visual and
interaction-design questions to Session 4.

### Verification and handoff

Add focused tests or a deterministic harness for:

- concurrent row mutations where one succeeds and another fails;
- precise optimistic rollback;
- a refresh arriving during initial hydration;
- stale/out-of-order search responses;
- clearing a query while a request is in flight;
- logout/account switching clearing all Friends data.

Run `npx tsc --noEmit`, `git diff --check`, and the relevant tests. Finish with
a compact Session 4 handoff listing the stable props/actions/state selectors,
loading/error semantics, relationship labels, and any UI decisions that remain
open.
