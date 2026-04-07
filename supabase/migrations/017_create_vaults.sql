-- Vaults: goal-bound content workspaces
-- One vault per goal, auto-created on goal creation

create table public.vaults (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  goal_id uuid not null references public.goals(id) on delete cascade,
  space_id uuid references public.spaces(id) on delete set null,
  vault_type text not null default 'personal' check (
    vault_type in ('personal','shared','institutional')
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(goal_id)
);

create index vaults_user_id_idx on public.vaults(user_id);
create index vaults_goal_id_idx on public.vaults(goal_id);
create index vaults_space_id_idx on public.vaults(space_id);

alter table public.vaults enable row level security;

create policy "Vault owners can read"
  on public.vaults for select using (
    user_id = auth.uid()
  );

create policy "Goal owners can create vaults"
  on public.vaults for insert with check (
    user_id = auth.uid()
  );

create policy "Vault owners can update"
  on public.vaults for update using (
    user_id = auth.uid()
  );

create policy "Vault owners can delete"
  on public.vaults for delete using (
    user_id = auth.uid()
  );

-- Vault items: content within a vault

create table public.vault_items (
  id uuid primary key default gen_random_uuid(),
  vault_id uuid not null references public.vaults(id) on delete cascade,
  item_type text not null check (
    item_type in ('note','link','document','insight','action_update')
  ),
  title text,
  content text,
  metadata jsonb not null default '{}',
  visibility text not null default 'private' check (
    visibility in ('private','vault_members','public')
  ),
  created_by uuid not null references auth.users(id) on delete cascade,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index vault_items_vault_id_idx on public.vault_items(vault_id);
create index vault_items_vault_id_sort_order_idx on public.vault_items(vault_id, sort_order);
create index vault_items_created_by_idx on public.vault_items(created_by);

alter table public.vault_items enable row level security;

create policy "Users can read vault items they own"
  on public.vault_items for select using (
    exists (
      select 1
      from public.vaults v
      where v.id = public.vault_items.vault_id
        and v.user_id = auth.uid()
    )
  );

create policy "Users can create vault items in their vaults"
  on public.vault_items for insert with check (
    exists (
      select 1
      from public.vaults v
      where v.id = public.vault_items.vault_id
        and v.user_id = auth.uid()
    )
  );

create policy "Item creators can update"
  on public.vault_items for update using (
    created_by = auth.uid()
  );

create policy "Item creators can delete"
  on public.vault_items for delete using (
    created_by = auth.uid()
  );