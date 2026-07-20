-- Migration 025: canonical goal milestones, trackers, and archive status
--
-- Milestones are one-time, goal-critical events. Trackers are the recurring or
-- quantitative records previously stored as measurables. This migration keeps
-- all existing measurable data in place while adopting the canonical names.

-- Goal archival is a real lifecycle state, distinct from discovered.
alter table public.goals
  drop constraint goals_status_check;

alter table public.goals
  add constraint goals_status_check
  check (status in ('active', 'complete', 'stagnant', 'discovered', 'archived'));

-- Canonical tracker table names. PostgreSQL carries table data, RLS enablement,
-- grants, and foreign-key targets through these renames.
alter table public.measurables rename to trackers;
alter table public.measurable_logs rename to tracker_logs;
alter table public.tracker_logs rename column measurable_id to tracker_id;

-- Keep database object names aligned with the canonical table/column names.
alter table public.trackers
  rename constraint measurables_pkey to trackers_pkey;
alter table public.trackers
  rename constraint measurables_goal_id_fkey to trackers_goal_id_fkey;
alter table public.trackers
  rename constraint measurables_type_check to trackers_type_check;
alter table public.trackers
  rename constraint measurables_frequency_check to trackers_frequency_check;

-- A one-time critical event is a milestone, not a tracker cadence. Example
-- development rows using the legacy value are normalized before tightening
-- the canonical tracker constraint.
update public.trackers
set frequency = null
where frequency = 'once';

alter table public.trackers
  drop constraint trackers_frequency_check;
alter table public.trackers
  add constraint trackers_frequency_check
  check (frequency in ('daily', 'weekly', 'monthly'));

alter table public.tracker_logs
  rename constraint measurable_logs_pkey to tracker_logs_pkey;
alter table public.tracker_logs
  rename constraint measurable_logs_measurable_id_fkey to tracker_logs_tracker_id_fkey;

alter index public.idx_measurables_goal_id
  rename to idx_trackers_goal_id;
alter index public.idx_measurable_logs_mid
  rename to idx_tracker_logs_tracker_id;

alter policy "Users can select measurables for own goals"
  on public.trackers rename to "Users can select trackers for own goals";
alter policy "Users can insert measurables for own goals"
  on public.trackers rename to "Users can insert trackers for own goals";
alter policy "Users can update measurables for own goals"
  on public.trackers rename to "Users can update trackers for own goals";
alter policy "Users can delete measurables for own goals"
  on public.trackers rename to "Users can delete trackers for own goals";

alter policy "Users can select own measurable logs"
  on public.tracker_logs rename to "Users can select own tracker logs";
alter policy "Users can insert own measurable logs"
  on public.tracker_logs rename to "Users can insert own tracker logs";
alter policy "Users can update own measurable logs"
  on public.tracker_logs rename to "Users can update own tracker logs";
alter policy "Users can delete own measurable logs"
  on public.tracker_logs rename to "Users can delete own tracker logs";

comment on table public.trackers is
  'Recurring or quantitative measures used to track progress toward a goal.';
comment on table public.tracker_logs is
  'Time-stamped progress observations recorded against goal trackers.';

-- Evolve the existing milestones table into the canonical one-time event shape.
alter table public.milestones
  add column description text,
  add column completed_at timestamptz,
  add column sort_order integer not null default 0,
  add column is_ai_suggested boolean not null default false,
  add column updated_at timestamptz not null default now();

-- Preserve legacy completion state. completed_at is now the sole completion
-- source of truth: NULL means pending; a timestamp means completed.
update public.milestones
set completed_at = created_at
where complete = true;

alter table public.milestones
  drop column complete;

create index idx_milestones_goal_sort_order
  on public.milestones (goal_id, sort_order);

create trigger milestones_updated_at
  before update on public.milestones
  for each row execute function public.handle_updated_at();

comment on table public.milestones is
  'One-time events that are critical to achieving a goal.';
comment on column public.milestones.completed_at is
  'Canonical completion source of truth. NULL means the milestone is pending.';
