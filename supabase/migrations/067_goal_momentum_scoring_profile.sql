-- Goals V2.2 (067): product organization is independent of Momentum V1.1 scoring.
-- Run before the taxonomy data migration. No snapshot/event tables are changed.
alter table public.goals add column momentum_scoring_profile text;

create function public.goal_scoring_profile_for_category(p_category text)
returns text language plpgsql immutable set search_path = pg_catalog, public as $$
begin
  return case lower(btrim(p_category))
    when 'body' then 'health_fitness' when 'health' then 'health_fitness'
    when 'health_fitness' then 'health_fitness' when 'health & fitness' then 'health_fitness'
    when 'money' then 'finance' when 'finance' then 'finance' when 'work & money' then 'finance'
    when 'career' then 'career'
    when 'create' then 'creative' when 'creative' then 'creative' when 'learning & creativity' then 'creative'
    when 'mind' then 'education' when 'education' then 'education'
    when 'connect' then 'relationships' when 'relationships' then 'relationships'
    when 'life & relationships' then 'relationships'
    when 'contribute' then 'personal_growth' when 'growth' then 'personal_growth'
    when 'personal_growth' then 'personal_growth'
    else null end;
end;
$$;

-- Existing mind Goals retain education even when their approved product category differs.
update public.goals
set momentum_scoring_profile = public.goal_scoring_profile_for_category(category);

-- Unknown historical values abort rather than silently adopting a fallback.
alter table public.goals alter column momentum_scoring_profile set not null;
alter table public.goals add constraint goals_momentum_scoring_profile_check
  check (momentum_scoring_profile in
    ('health_fitness','finance','career','creative','education','relationships','personal_growth'));

create function public.preserve_goal_scoring_profile()
returns trigger language plpgsql set search_path = pg_catalog, public as $$
begin
  if tg_op = 'UPDATE' then
    if new.momentum_scoring_profile is distinct from old.momentum_scoring_profile then
      raise exception 'Momentum scoring profile cannot be changed by a Goal edit';
    end if;
    return new;
  end if;
  if new.previous_goal_id is not null then
    select g.momentum_scoring_profile into new.momentum_scoring_profile
      from public.goals g
      where g.id = new.previous_goal_id and g.user_id = new.user_id;
    if new.momentum_scoring_profile is null then
      raise exception 'Cannot inherit scoring profile from this predecessor';
    end if;
  else
    -- Do not accept client-selected scoring calibration.
    new.momentum_scoring_profile := public.goal_scoring_profile_for_category(new.category);
  end if;
  if new.momentum_scoring_profile is null then raise exception 'Unknown scoring category'; end if;
  return new;
end;
$$;

create trigger goals_preserve_momentum_scoring_profile
before insert or update on public.goals
for each row execute function public.preserve_goal_scoring_profile();

comment on column public.goals.momentum_scoring_profile is
  'Immutable Momentum V1.1 compatibility baseline, independent of product category. Existing rows preserve pre-V2.2 scoring; New Phase inherits it. No recalibration UI.';
revoke all on function public.preserve_goal_scoring_profile() from public, anon, authenticated;
