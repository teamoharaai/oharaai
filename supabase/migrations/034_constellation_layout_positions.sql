-- ============================================================================
-- 034_constellation_layout_positions.sql
-- Persists owner-scoped Constellation node placement. Derived goal satellites
-- store parent-relative offsets; all other nodes store normalized canvas
-- coordinates. Graph/domain entities remain the authoritative node source.
-- ============================================================================

create table public.constellation_layout_positions (
  owner_id         uuid not null references auth.users(id) on delete cascade,
  selection_key    text not null,
  coordinate_space text not null,
  x                double precision not null,
  y                double precision not null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),

  primary key (owner_id, selection_key),

  constraint constellation_layout_positions_selection_key_check
    check (
      selection_key = btrim(selection_key)
      and char_length(selection_key) between 1 and 200
    ),
  constraint constellation_layout_positions_coordinate_space_check
    check (coordinate_space in ('canvas', 'parent')),
  constraint constellation_layout_positions_coordinates_check
    check (
      (
        coordinate_space = 'canvas'
        and x between 0.02 and 0.98
        and y between 0.02 and 0.98
      )
      or (
        coordinate_space = 'parent'
        and x between -1 and 1
        and y between -1 and 1
      )
    )
);

create index constellation_layout_positions_owner_updated_idx
  on public.constellation_layout_positions (owner_id, updated_at desc);

create trigger constellation_layout_positions_updated_at
  before update on public.constellation_layout_positions
  for each row execute function public.handle_updated_at();

alter table public.constellation_layout_positions enable row level security;

create policy "Users can read own constellation layout positions"
  on public.constellation_layout_positions
  for select
  using (owner_id = auth.uid());

create policy "Users can create own constellation layout positions"
  on public.constellation_layout_positions
  for insert
  with check (owner_id = auth.uid());

create policy "Users can update own constellation layout positions"
  on public.constellation_layout_positions
  for update
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "Users can delete own constellation layout positions"
  on public.constellation_layout_positions
  for delete
  using (owner_id = auth.uid());
