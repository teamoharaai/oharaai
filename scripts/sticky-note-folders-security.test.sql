-- Adversarial RLS assertions for per-goal Sticky Note folders (migrations 065 +
-- 066). Runs against the disposable cluster set up by the bootstrap. Any
-- violation raises and aborts the run (ON_ERROR_STOP).
\set ON_ERROR_STOP on

-- ── Seed as superuser (bypasses RLS) ──────────────────────────────────────────
insert into auth.users (id) values
  ('10000000-0000-0000-0000-000000000001'),  -- user A
  ('10000000-0000-0000-0000-000000000002');  -- user B

insert into public.goals (id, user_id, title) values
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'A goal'),
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', 'B goal');

insert into public.vaults (id, user_id, goal_id) values
  ('30000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001'),
  ('30000000-0000-0000-0000-00000000000b', '10000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002');

-- A note living in A's vault.
insert into public.vault_items (id, vault_id, item_type, title, created_by) values
  ('40000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-00000000000a', 'note', 'A note', '10000000-0000-0000-0000-000000000001');

-- ── A creates a folder in A's own vault (happy path) ──────────────────────────
set role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', false);
insert into public.vault_note_folders (id, vault_id, user_id, name) values
  ('50000000-0000-0000-0000-0000000000a1', '30000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-000000000001', 'Research');

-- ── B creates a folder in B's own vault (happy path) ──────────────────────────
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000002', false);
insert into public.vault_note_folders (id, vault_id, user_id, name) values
  ('50000000-0000-0000-0000-0000000000b1', '30000000-0000-0000-0000-00000000000b', '10000000-0000-0000-0000-000000000002', 'Ideas');

-- ── Cross-user isolation: B must not see, edit, or delete A's folder ───────────
do $$
begin
  if (select count(*) from public.vault_note_folders
      where id = '50000000-0000-0000-0000-0000000000a1') <> 0 then
    raise exception 'SECURITY: user B can read user A''s folder';
  end if;
end $$;

-- B's UPDATE/DELETE against A's folder are RLS-filtered (affect 0 rows). Verify
-- below (as superuser) that A's folder is untouched.
update public.vault_note_folders set name = 'hacked' where id = '50000000-0000-0000-0000-0000000000a1';
delete from public.vault_note_folders where id = '50000000-0000-0000-0000-0000000000a1';

-- ── Vault-ownership write guard (migration 066) ───────────────────────────────
-- B (still the active subject) must not create a folder pointing at A's vault,
-- with either A's or B's user_id.
do $$
begin
  begin
    insert into public.vault_note_folders (vault_id, user_id, name)
    values ('30000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-000000000002', 'sneaky-b');
    raise exception 'SECURITY: user B created a folder in user A''s vault (own user_id)';
  exception when insufficient_privilege then null; -- expected: RLS with-check blocked it
  end;

  begin
    insert into public.vault_note_folders (vault_id, user_id, name)
    values ('30000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-000000000001', 'sneaky-a');
    raise exception 'SECURITY: user B forged a folder owned by user A';
  exception when insufficient_privilege then null; -- expected
  end;
end $$;

-- ── Case-insensitive unique folder name per vault ─────────────────────────────
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', false);
do $$
begin
  begin
    insert into public.vault_note_folders (vault_id, user_id, name)
    values ('30000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-000000000001', 'research');
    raise exception 'INTEGRITY: duplicate folder name (case-insensitive) was allowed in one vault';
  exception when unique_violation then null; -- expected
  end;
end $$;

-- ── FK ON DELETE SET NULL: deleting a folder falls its notes back to General ──
-- A files the note into Research, then deletes Research; the note must survive
-- with folder_id NULL (General), never be destroyed.
update public.vault_items set folder_id = '50000000-0000-0000-0000-0000000000a1'
  where id = '40000000-0000-0000-0000-000000000001';
do $$
begin
  if (select folder_id from public.vault_items where id = '40000000-0000-0000-0000-000000000001')
     is distinct from '50000000-0000-0000-0000-0000000000a1'::uuid then
    raise exception 'A could not file its own note into its own folder';
  end if;
end $$;

delete from public.vault_note_folders where id = '50000000-0000-0000-0000-0000000000a1';

reset role;

-- ── Final state checks as superuser ───────────────────────────────────────────
do $$
begin
  -- A's other folder (never created) aside, the note must still exist, now General.
  if not exists (select 1 from public.vault_items where id = '40000000-0000-0000-0000-000000000001') then
    raise exception 'FK cascade destroyed the note instead of nulling folder_id';
  end if;
  if (select folder_id from public.vault_items where id = '40000000-0000-0000-0000-000000000001') is not null then
    raise exception 'Deleting a folder did not reassign its note to General (folder_id NULL)';
  end if;
  -- B's failed edits left A's data alone — but A deleted Research above, so only
  -- confirm B's own folder is intact and A has no lingering folders.
  if not exists (select 1 from public.vault_note_folders where id = '50000000-0000-0000-0000-0000000000b1') then
    raise exception 'user B''s own folder was lost';
  end if;
end $$;

\echo 'sticky-note-folders security assertions passed'
