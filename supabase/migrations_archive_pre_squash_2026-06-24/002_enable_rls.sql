-- ─── Enable RLS on all tables ─────────────────────────────────────────────────
alter table public.profiles enable row level security;
alter table public.goals enable row level security;
alter table public.milestones enable row level security;
alter table public.echo_sessions enable row level security;
alter table public.echo_entries enable row level security;
alter table public.interests enable row level security;

-- ─── Profiles policies ────────────────────────────────────────────────────────
create policy "Users can read own profile"
  on public.profiles for select
  using (id = auth.uid());

create policy "Users can update own profile"
  on public.profiles for update
  using (id = auth.uid());

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (id = auth.uid());

-- ─── Goals policies ───────────────────────────────────────────────────────────
create policy "Users can select own goals"
  on public.goals for select
  using (user_id = auth.uid());

create policy "Users can insert own goals"
  on public.goals for insert
  with check (user_id = auth.uid());

create policy "Users can update own goals"
  on public.goals for update
  using (user_id = auth.uid());

create policy "Users can delete own goals"
  on public.goals for delete
  using (user_id = auth.uid());

-- ─── Milestones policies ──────────────────────────────────────────────────────
create policy "Users can select own milestones"
  on public.milestones for select
  using (user_id = auth.uid());

create policy "Users can insert own milestones"
  on public.milestones for insert
  with check (user_id = auth.uid());

create policy "Users can update own milestones"
  on public.milestones for update
  using (user_id = auth.uid());

create policy "Users can delete own milestones"
  on public.milestones for delete
  using (user_id = auth.uid());

-- ─── Echo sessions policies ───────────────────────────────────────────────
create policy "Users can select own echo sessions"
  on public.echo_sessions for select
  using (user_id = auth.uid());

create policy "Users can insert own echo sessions"
  on public.echo_sessions for insert
  with check (user_id = auth.uid());

create policy "Users can update own echo sessions"
  on public.echo_sessions for update
  using (user_id = auth.uid());

create policy "Users can delete own echo sessions"
  on public.echo_sessions for delete
  using (user_id = auth.uid());

-- ─── Echo entries policies ─────────────────────────────────────────────────
create policy "Users can select own echo entries"
  on public.echo_entries for select
  using (user_id = auth.uid());

create policy "Users can insert own echo entries"
  on public.echo_entries for insert
  with check (user_id = auth.uid());

create policy "Users can update own echo entries"
  on public.echo_entries for update
  using (user_id = auth.uid());

create policy "Users can delete own echo entries"
  on public.echo_entries for delete
  using (user_id = auth.uid());

-- ─── Interests policies ───────────────────────────────────────────────────────
create policy "Users can select own interests"
  on public.interests for select
  using (user_id = auth.uid());

create policy "Users can insert own interests"
  on public.interests for insert
  with check (user_id = auth.uid());

create policy "Users can update own interests"
  on public.interests for update
  using (user_id = auth.uid());

create policy "Users can delete own interests"
  on public.interests for delete
  using (user_id = auth.uid());
