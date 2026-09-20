-- Migration 062: unify goal Sticky Notes (goal_notes, migration 058) into the
-- Vault (vault_items, migration 004).
--
-- Rationale: the Vault is the goal's knowledge stronghold — its items are
-- embedded (pgvector/HNSW, match_vault_items) so they feed search and Ohara
-- Intelligence. Sticky notes captured exactly that kind of information but lived
-- in a separate, un-embedded table, invisible to the stronghold. This migration
-- makes vault_items the single canonical note store: each goal_note becomes a
-- vault_item of type 'note' (title -> title, body -> content, photo -> metadata
-- .photoUrl), preserving the original card date (created_at). goal_note photos
-- keep living in the goal-note-photos bucket (owner-scoped, migration 058) —
-- only the reference moves, no storage objects are copied.
--
-- After the copy, goal_notes writes are FROZEN (revoked from authenticated),
-- mirroring the trackers cutover (migration 051). The table + rows are kept
-- read-only as a rollback window; a later migration drops them once verified.
--
-- Ordering: migration 061 backfills vaults for all goals, so every goal_note
-- has a vault to land in. A defensive backfill is repeated here so 061 is
-- self-sufficient if replayed independently.
--
-- Idempotent: the copy is guarded by a provenance match on
-- metadata->>'legacyId'/'migratedFrom', so re-running inserts nothing new.
-- Additive + non-destructive: no goal_notes rows are modified or deleted.

-- 1. Defensive: ensure every goal carrying notes has a vault (no-op after 060).
insert into public.vaults (goal_id, user_id, vault_type)
select distinct gn.goal_id, gn.user_id, 'personal'
from public.goal_notes gn
where not exists (
  select 1 from public.vaults v where v.goal_id = gn.goal_id
)
on conflict (goal_id) do nothing;

-- 2. Copy each sticky note into its goal's vault as a note-type vault_item.
--    Provenance (migratedFrom/legacyId) makes the copy idempotent and reversible.
--    embedding_text is seeded from title+body so the existing needs-embedding
--    backfill (idx_vault_items_needs_embedding) vectorizes these rows.
insert into public.vault_items (
  vault_id, item_type, title, content, metadata,
  visibility, created_by, sort_order, created_at, updated_at, embedding_text
)
select
  v.id,
  'note',
  gn.title,
  gn.body,
  case
    when gn.photo_url is not null then
      jsonb_build_object(
        'photoUrl', gn.photo_url,
        'migratedFrom', 'goal_notes',
        'legacyId', gn.id::text
      )
    else
      jsonb_build_object(
        'migratedFrom', 'goal_notes',
        'legacyId', gn.id::text
      )
  end,
  'private',
  gn.user_id,
  0,
  gn.created_at,
  gn.updated_at,
  nullif(btrim(coalesce(gn.title, '') || ' ' || coalesce(gn.body, '')), '')
from public.goal_notes gn
join public.vaults v on v.goal_id = gn.goal_id
where not exists (
  select 1 from public.vault_items vi
  where vi.vault_id = v.id
    and vi.metadata->>'migratedFrom' = 'goal_notes'
    and vi.metadata->>'legacyId' = gn.id::text
);

-- 3. Freeze goal_notes writes. Reads stay for the rollback window; a later
--    migration drops the table + goal-note-photos bucket once verified.
revoke insert, update, delete on table public.goal_notes from authenticated;

comment on table public.goal_notes is
  'FROZEN 2026-09-19 (migration 062): sticky notes unified into vault_items '
  '(item_type=note, photo in metadata.photoUrl). Read-only rollback window; '
  'authenticated writes revoked. Slated for drop after live verification.';
