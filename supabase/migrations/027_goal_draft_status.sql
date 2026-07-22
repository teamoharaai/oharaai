-- Allow fully persisted goal drafts while keeping active as the default for
-- every existing and future creation path that does not explicitly supply one.
alter table public.goals
  drop constraint if exists goals_status_check;

alter table public.goals
  add constraint goals_status_check
  check (status in ('active', 'draft', 'complete', 'stagnant', 'discovered', 'archived'));

alter table public.goals
  alter column status set default 'active';
