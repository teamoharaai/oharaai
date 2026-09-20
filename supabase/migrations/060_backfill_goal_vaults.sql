-- Migration 060: backfill vaults for existing vault-less goals.
--
-- The "one vault per goal" contract (unique(goal_id) on vaults, migration 004)
-- was only honored when goal creation passed a vaultContext, so goals created
-- through the normal flow — and every goal predating the Vault feature — have
-- no vault row. The re-added Vault UI then 404s on those goals. Goal creation
-- now mints a vault unconditionally (lib/db/goals.ts) and the read path
-- self-heals (getOrCreateVaultForUser), but existing goals still need a
-- one-time backfill so the stronghold exists everywhere, not just on first open.
--
-- Idempotent: guarded by NOT EXISTS and by unique(goal_id) via ON CONFLICT.
-- Every goal gets a personal vault owned by the goal's user. Non-destructive.

insert into public.vaults (goal_id, user_id, vault_type)
select g.id, g.user_id, 'personal'
from public.goals g
where not exists (
  select 1 from public.vaults v where v.goal_id = g.id
)
on conflict (goal_id) do nothing;
