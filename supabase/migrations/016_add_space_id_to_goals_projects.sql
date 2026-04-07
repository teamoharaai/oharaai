-- Nullable FK: existing goals/projects remain personal (null = personal space)
-- No data migration needed yet. Backfill can happen later.

alter table public.goals
  add column space_id uuid references public.spaces(id) on delete set null;

alter table public.projects
  add column space_id uuid references public.spaces(id) on delete set null;

create index goals_space_id_idx on public.goals(space_id);
create index projects_space_id_idx on public.projects(space_id);