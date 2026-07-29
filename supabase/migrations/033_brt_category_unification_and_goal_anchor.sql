-- ============================================================================
-- 033_brt_category_unification_and_goal_anchor.sql
-- Additive/normalizing. Does not touch 001-032 files.
--
-- Two locked schema decisions (docs/constellation/DECISIONS.md, Vision
-- Alignment #4 and the goal-anchor annotation work):
--
--   1. BRT category source of truth moves onto echo_entries. A single-category
--      text field (bud|rose|thorn) becomes the per-entry BRT category; the
--      per-link constellation_evidence_links.brt_category column is retired.
--      NOTE: this lands as a NEW column echo_entries.brt_category. It is
--      deliberately NOT echo_entries.brt_user: brt / brt_ai / brt_user are the
--      dormant jsonb columns from migration 007's deferred AI-vs-user BRT
--      *structure* split (full EchoBrt {bud,rose,thorn} arrays, 0 live rows,
--      no write path). They are untouched here and have no semantic overlap
--      with this single-category tag.
--
--   2. constellation_annotations gains a second, parallel anchor path so a
--      user annotation can hang off a goal node in addition to the existing
--      earned-node anchor.
--
-- Out of scope (unchanged): constellation_nodes / constellation_edges
-- structure, trait/tension/ambition work, multi-goal-per-entry linking, and
-- any frontend/service code.
-- ============================================================================

-- Step 1 — echo_entries.brt_category ----------------------------------------
-- Nullable single-category tag. CHECK mirrors the retired
-- constellation_evidence_links.brt_category value set (bud|rose|thorn).
alter table public.echo_entries
  add column brt_category text;

alter table public.echo_entries
  add constraint echo_entries_brt_category_check
  check (brt_category is null or brt_category in ('bud', 'rose', 'thorn'));

-- Step 2 — drop constellation_evidence_links.brt_category -------------------
-- constellation_evidence_links has 0 rows (verified live), so there is nothing
-- to back-fill; brt_category simply retires. Dropping the column also drops
-- constellation_evidence_links_goal_lookup_idx, which was defined on
-- (owner_id, goal_id, brt_category). Recreate it on (owner_id, goal_id) so the
-- goal-scoped evidence lookup path survives the category removal.
alter table public.constellation_evidence_links
  drop column brt_category;

create index constellation_evidence_links_goal_lookup_idx
  on public.constellation_evidence_links (owner_id, goal_id);

-- Step 3 — goal-anchor support on constellation_annotations -----------------
-- Parallel to the existing anchor_earned_node_id path. Composite FK enforces
-- the same same-owner alignment used elsewhere for source references; on goal
-- delete only anchor_goal_id is nulled (owner_id stays NOT NULL) via PG15+
-- column-list SET NULL. An annotation may anchor to at most one of an earned
-- node or a goal; both null (unanchored) remains valid.
alter table public.constellation_annotations
  add column anchor_goal_id uuid;

alter table public.constellation_annotations
  add constraint constellation_annotations_anchor_goal_fkey
  foreign key (anchor_goal_id, owner_id)
  references public.goals(id, user_id)
  on delete set null (anchor_goal_id);

alter table public.constellation_annotations
  add constraint constellation_annotations_single_anchor_check
  check (num_nonnulls(anchor_earned_node_id, anchor_goal_id) <= 1);

create index constellation_annotations_goal_anchor_lookup_idx
  on public.constellation_annotations (owner_id, anchor_goal_id)
  where anchor_goal_id is not null;

-- Mirror the existing same-owner anchor trigger for the new goal anchor. The
-- composite FK already guarantees same-owner; this keeps the belt-and-braces
-- trigger validation symmetric with anchor_earned_node_id.
create or replace function public.validate_constellation_annotation_anchor()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.anchor_earned_node_id is not null and not exists (
    select 1
    from public.constellation_nodes node
    where node.id = new.anchor_earned_node_id
      and node.owner_id = new.owner_id
  ) then
    raise exception using
      errcode = '23514',
      message = 'constellation annotation anchor must belong to the same owner';
  end if;

  if new.anchor_goal_id is not null and not exists (
    select 1
    from public.goals goal
    where goal.id = new.anchor_goal_id
      and goal.user_id = new.owner_id
  ) then
    raise exception using
      errcode = '23514',
      message = 'constellation annotation goal anchor must belong to the same owner';
  end if;

  return new;
end;
$$;

-- Recreate the trigger to add anchor_goal_id to the fired column list.
drop trigger constellation_annotations_validate_anchor
  on public.constellation_annotations;

create trigger constellation_annotations_validate_anchor
  before insert or update of anchor_earned_node_id, anchor_goal_id, owner_id
  on public.constellation_annotations
  for each row execute function public.validate_constellation_annotation_anchor();
