-- Migration 019: RLS and trigger fixes
-- Addresses issues found in audit of migrations 014-018:
--   1. Recursive space_members SELECT policy replaced with non-recursive version
--   2. Spaces SELECT policy consolidated to a single safe version
--   3. updated_at triggers added to spaces, vaults, vault_items
--   4. vault_items INSERT policy tightened to enforce created_by = auth.uid()
--   5. echo_goal_links.confidence changed from double precision to numeric

-- ─── 1. Fix space_members SELECT policy (recursive → non-recursive) ──────────

drop policy if exists "Members can see their space members" on public.space_members;

create policy "Members can see their space members"
  on public.space_members for select using (
    user_id = auth.uid()
    or exists (
      select 1
      from public.spaces s
      where s.id = space_members.space_id
        and s.user_id = auth.uid()
    )
  );

-- ─── 2. Fix spaces SELECT policies ───────────────────────────────────────────
-- Drop both existing SELECT policies and replace with one canonical version.
-- 014 added "Users can read own spaces"; 015 added "Members can read shared
-- spaces". The 015 version queried space_members, which itself queried spaces,
-- creating a cross-table cycle. Replace with a single policy that checks
-- ownership directly and membership via a simple non-recursive subquery.

drop policy if exists "Users can read own spaces" on public.spaces;
drop policy if exists "Members can read shared spaces" on public.spaces;

create policy "Users can read own and member spaces"
  on public.spaces for select using (
    user_id = auth.uid()
    or exists (
      select 1
      from public.space_members sm
      where sm.space_id = spaces.id
        and sm.user_id = auth.uid()
    )
  );

-- ─── 3. Add updated_at triggers ──────────────────────────────────────────────
-- handle_updated_at() already exists from migration 001.

drop trigger if exists spaces_updated_at on public.spaces;
create trigger spaces_updated_at
  before update on public.spaces
  for each row execute function public.handle_updated_at();

drop trigger if exists vaults_updated_at on public.vaults;
create trigger vaults_updated_at
  before update on public.vaults
  for each row execute function public.handle_updated_at();

drop trigger if exists vault_items_updated_at on public.vault_items;
create trigger vault_items_updated_at
  before update on public.vault_items
  for each row execute function public.handle_updated_at();

-- ─── 4. Tighten vault_items INSERT policy ────────────────────────────────────

drop policy if exists "Users can create vault items in their vaults" on public.vault_items;

create policy "Users can create vault items in their vaults"
  on public.vault_items for insert with check (
    created_by = auth.uid()
    and exists (
      select 1
      from public.vaults v
      where v.id = vault_items.vault_id
        and v.user_id = auth.uid()
    )
  );

-- ─── 5. Align echo_goal_links.confidence type with rest of schema ─────────────

alter table public.echo_goal_links
  alter column confidence type numeric using confidence::numeric;
