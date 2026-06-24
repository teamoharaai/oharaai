-- Block 0.2: harden action_logs RLS so goal ownership is enforced by the DB
-- in addition to the denormalized user_id column.

alter table public.action_logs enable row level security;

drop policy if exists "Users can view own action logs" on public.action_logs;
drop policy if exists "Users can insert own action logs" on public.action_logs;
drop policy if exists "Users can update own action logs" on public.action_logs;

create policy "Users can view own action logs"
  on public.action_logs for select
  using (
    user_id = auth.uid()
    and exists (
      select 1
      from public.goals g
      where g.id = public.action_logs.goal_id
        and g.user_id = auth.uid()
    )
  );

create policy "Users can insert own action logs"
  on public.action_logs for insert
  with check (
    user_id = auth.uid()
    and exists (
      select 1
      from public.goals g
      where g.id = public.action_logs.goal_id
        and g.user_id = auth.uid()
    )
  );

create policy "Users can update own action logs"
  on public.action_logs for update
  using (
    user_id = auth.uid()
    and exists (
      select 1
      from public.goals g
      where g.id = public.action_logs.goal_id
        and g.user_id = auth.uid()
    )
  )
  with check (
    user_id = auth.uid()
    and exists (
      select 1
      from public.goals g
      where g.id = public.action_logs.goal_id
        and g.user_id = auth.uid()
    )
  );
