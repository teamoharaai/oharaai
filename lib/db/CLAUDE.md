# lib/db/CLAUDE.md — Data Access Layer

Owner: CTO. Cascade Level 2 (data fetching), Level 3 for schema-shaped changes
(row/domain type contracts shared with app/api/*).

## Client setup
- `client.ts`: anon-key Supabase client (`supabase`). Module-init is SSR-safe —
  falls back to `''` env vars and `isDatabaseConfigured` rather than throwing
  (Layer 1). `createAuthedClient(accessToken)` builds a per-request client for
  routes that need to act as a specific user.
- `service-client.ts`: `createServiceRoleClient()` — server-only, throws at
  call time (Layer 2, not module init) if `SUPABASE_SERVICE_ROLE_KEY` is
  missing. Never import from client-bundled code. Used only where RLS must be
  bypassed (e.g. `get_or_create_general_folder`, locked to `service_role` by
  migration 014).
- Every service function takes an optional `client: DbClient = supabase`
  param so callers can swap in an authed or service-role client without
  changing the function body.

## Modules
- `goals.ts`: goal CRUD, milestone persistence, embedding generation on
  create/update via `lib/ai/embeddings.ts`.
- `spaces.ts`: Spaces CRUD and membership (`space_members`).
- `vaults.ts`: vault + vault_items CRUD, one vault per goal (auto-created,
  non-blocking on failure per root CLAUDE.md).
- `echo-folders.ts`: Echo Folders CRUD. `getOrCreateGeneralFolderId` always
  mints its own service-role client (RPC is service_role-only); folder delete
  RPCs (`delete_folder_reassign`, `delete_folder_with_contents`, migration
  015) must be called with an authed client since they rely on `auth.uid()`.
- `echo-entry-links.ts`: many-to-many Echo↔container links
- `constellation.ts`: owner-scoped graph snapshots and inspectors, layout
  position reads/upserts/reset, and private undirected goal-link CRUD.
  Canonical goal Entry counts dedupe confirmed `echo_entry_links` containers
  with optional Constellation evidence references; never treat evidence
  references as Entry containers. User-authored goal links stay separate from
  system-managed constellation_edges and resolve through same-owner goals.
  (`echo_entry_links`, generalized from `echo_goal_links`). All service
  functions here filter `container_type = 'goal'`; folder-side equivalents
  are separate scope. `moveEntryContainer` only ever repoints the single
  confirmed row for an entry — unconfirmed `ai_suggested` links are left
  untouched.
- `embeddings.ts`: pgvector similarity search (echo entries, goals, vault
  items) via generated-column embeddings.

## Conventions
- Row types are `DbXRow` (snake_case, mirrors Postgres), mapped to camelCase
  domain types via a local `mapX()` function. Never leak `DbXRow` shapes past
  the module boundary.
- `userId` passed into these functions must already have been resolved from
  the server-side session by the caller — these modules don't re-derive it.
- Throw on Supabase `error`; return `null`/`[]` for legitimate not-found
  cases (`maybeSingle()` → `null`), not for errors.
- RLS is the default; only reach for `service-client.ts` when a specific RPC
  or table grant requires it, and say why in a comment.
