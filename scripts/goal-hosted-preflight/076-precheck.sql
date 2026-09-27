-- 076 pre-check, read-only on existing data. Runs before 076 is applied, inside the preflight transaction.
-- It mirrors 076's own repair: rank each live scheduler-created Task-day exactly as 076 does, drop the rows
-- 076 would cancel (redundant pending/missed), and count the Task-days that still hold more than one row.
-- Those are the days 076 aborts on with TASK_OCCURRENCE_DAY_CONFLICTS (in practice, Task-days with two or more
-- completed/skipped occurrences). The preflight reports the count and skips 076 instead of failing on it.
-- Sets :gate_076 for the runner, and :clean_076 (nothing to cancel either), which --apply also requires so
-- that applying 076 changes no existing row.
with ranked as (
  select task_id, scheduled_local_date, status, row_number() over (
    partition by task_id, scheduled_local_date
    order by (status in ('completed','skipped')) desc, (actual_quantity is not null and actual_quantity > 0) desc,
             created_at desc, id
  ) as rank
  from public.task_occurrences
  where source = 'schedule' and schedule_id is not null and status <> 'cancelled'
), after_repair as (
  select task_id, scheduled_local_date from ranked where rank = 1 or status not in ('pending','missed')
)
select
  (select count(*) from (select 1 from after_repair group by task_id, scheduled_local_date having count(*) > 1) d) as day_conflicts,
  (select count(*) from ranked where rank > 1 and status in ('pending','missed')) as open_rows_to_cancel
\gset pre076_
\echo '076 pre-check: Task-days 076 would abort on (TASK_OCCURRENCE_DAY_CONFLICTS):' :pre076_day_conflicts
\echo '076 pre-check: redundant pending/missed rows 076 would cancel:' :pre076_open_rows_to_cancel
select :pre076_day_conflicts = 0 as gate_076, :pre076_day_conflicts = 0 and :pre076_open_rows_to_cancel = 0 as clean_076 \gset
