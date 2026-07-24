# Session 2 — Friends API and Data Layer

## Recommended run

- Model: `gpt-5.6-sol`
- Reasoning effort: `xhigh`
- Use `max` only for a separate final adversarial security review.

## Prompt

You are implementing Session 2 of Ohara's Friends surface: the production API
and server data layer only.

Work in `/Users/justin.villalta/oharaai`. Read `AGENTS.md`,
`CHANGELOGCODEX.md`, `docs/DECISIONS.md`,
`supabase/migrations/030_friend_connection_security.sql`,
`supabase/CLAUDE.md`, and the relevant reference files under
`handoff_account_tab/` before editing. Treat the handoff as the product
prototype, but adapt it to the repository's existing architecture and security
boundaries. Update `CHANGELOGCODEX.md` for every code change.

### Completed foundation

- Linked Supabase migrations are aligned through 030.
- Authenticated clients cannot directly insert, update, or delete
  `friend_connections`.
- `send_friend_request(uuid)` and
  `respond_to_friend_request(uuid, text)` are the only friend mutation
  capabilities.
- Connection participants are immutable and status transitions are limited to
  `pending -> accepted` or `pending -> declined`.
- Same-direction retries after decline have a seven-day cooldown.
- `get_profiles_by_ids(uuid[])` is connection-scoped.
- A friendship is only a relationship primitive. It grants no goal, Echo,
  project, feed, or profile-content access.
- The social feature flag remains disabled while the implementation is built
  and verified.

### Objective

Implement a small, typed, authenticated Friends API and its server-side data
helpers. Do not copy the handoff's direct table mutations. Keep route handlers
thin and put database mapping/query logic in `lib/db/friends.ts` or the closest
existing server-side equivalent.

### Locked contract

Prefer this initial route set:

- `GET /api/friends`
  - Returns one initial snapshot containing accepted friends, `friend_count`,
    incoming requests, and sent requests.
  - Strong recommendation: do not add a redundant `/requests` snapshot route
    unless an existing repository convention makes it materially safer.
- `GET /api/friends/search?q=<username-prefix>`
  - Accept a trimmed username prefix of 3–20 characters.
  - Return each result's relationship as `none`, `pending_out`, `pending_in`,
    `friends`, or `self`.
- `POST /api/friends/request`
  - Validate the addressee UUID and call `send_friend_request`.
- `POST /api/friends/[id]/accept`
  - Validate the connection UUID and call
    `respond_to_friend_request(id, 'accepted')`.
- `POST /api/friends/[id]/decline`
  - Validate the connection UUID and call
    `respond_to_friend_request(id, 'declined')`.

Use the repository's `withAuth`, `createAuthedClient`, `ApiResponse`, and
existing error-code vocabulary. Use `CONFLICT` rather than inventing a new
`ALREADY_CONNECTED` code. Do not expose raw PostgreSQL/Supabase messages to the
client. Map expected domain failures into stable responses for invalid input,
not found, conflict, forbidden transitions, and cooldown. Preserve enough
structured information for the client to present a useful cooldown message
without parsing database prose.

Use deterministic ordering: accepted friends by username/display name and
requests newest first. Return the real connection ID created or reused by a
send. Avoid N+1 profile reads; use the connection-scoped hydration capability
or another equally constrained batched query. Never broaden profile visibility
or introduce a public friend-profile route.

Keep feature-facing types in `features/friends/types.ts`. Reuse existing API
and database types instead of creating parallel shapes where practical.

### Scope boundary

This session owns API routes, server data helpers, validation, response
mapping, and their tests. It does not own Zustand state, client hooks,
components, AvatarMenu changes, anchored positioning, theme work, schema
changes, or enabling the social flag.

If you uncover a new schema/security defect, stop before inventing a migration,
document the evidence, and return it to the schema/security session. If a
question concerns client concurrency, record it for Session 3. If it concerns
layout, accessibility, copy, responsive behavior, or the handoff's appearance,
record it for Session 4. Keep all API/data-layer follow-ups in this session.

### Verification and handoff

- Add focused route/data-layer tests or a deterministic harness for successful
  and rejected operations.
- Use disposable users for any live mutation test and always clean them up.
- Run `npx tsc --noEmit`, `git diff --check`, and the relevant test commands.
- Do not push a migration in this session.
- Finish with an exact route contract table: method, path, request shape,
  success shape, error codes, and sorting guarantees.
- Hand Session 3 the finalized types and endpoint contract, plus any known
  retry, idempotency, or error-mapping caveats.
