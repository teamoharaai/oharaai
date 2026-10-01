-- Adversarial RLS assertions for per-goal Sticky Note folders (migrations 065 +
-- 066). Runs on the full migration chain (scripts/db-chain/suites/sticky-note-folders.sh). Any
-- violation raises and aborts the run (ON_ERROR_STOP).
\set ON_ERROR_STOP on

-- ── Seed as postgres (bypasses RLS) ───────────────────────────────────────────
insert into auth.users (id) values
  ('10000000-0000-0000-0000-000000000001'),  -- user A
  ('10000000-0000-0000-0000-000000000002');  -- user B

-- Real Goals need a post-068 scoring category.
insert into public.goals (id, user_id, title, category) values
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'A goal', 'Work & Money'),
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', 'B goal', 'Work & Money');

insert into public.vaults (id, user_id, goal_id) values
  ('30000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001'),
  ('30000000-0000-0000-0000-00000000000b', '10000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002');

-- Historical folder rows and a note are seeded as the migration owner. Migration
-- 084 preserves these rows but revokes every authenticated folder writer.
insert into public.vault_items (id, vault_id, item_type, title, created_by) values
  ('40000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-00000000000a', 'note', 'A note', '10000000-0000-0000-0000-000000000001');

insert into public.vault_note_folders (id, vault_id, user_id, name) values
  ('50000000-0000-0000-0000-0000000000a1', '30000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-000000000001', 'Research'),
  ('50000000-0000-0000-0000-0000000000b1', '30000000-0000-0000-0000-00000000000b', '10000000-0000-0000-0000-000000000002', 'Ideas');

-- ── Historical rows stay owner-readable, but all writes are retired ───────────
set role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', false);
do $$
begin
  if (select count(*) from public.vault_note_folders) <> 1 then
    raise exception 'ARCHIVE: owner cannot read exactly their historical folder';
  end if;
  begin
    insert into public.vault_note_folders (vault_id, user_id, name)
    values ('30000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-000000000001', 'New folder');
    raise exception 'RETIREMENT: authenticated folder insert succeeded';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.vault_note_folders set name = 'Changed'
      where id = '50000000-0000-0000-0000-0000000000a1';
    raise exception 'RETIREMENT: authenticated folder update succeeded';
  exception when insufficient_privilege then null;
  end;
  begin
    delete from public.vault_note_folders
      where id = '50000000-0000-0000-0000-0000000000a1';
    raise exception 'RETIREMENT: authenticated folder delete succeeded';
  exception when insufficient_privilege then null;
  end;
end $$;

select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000002', false);
do $$
begin
  if exists (select 1 from public.vault_note_folders where id = '50000000-0000-0000-0000-0000000000a1') then
    raise exception 'SECURITY: user B can read user A''s historical folder';
  end if;
end $$;

reset role;

-- ── Final preservation checks as superuser ───────────────────────────────────
do $$
begin
  if not exists (select 1 from public.vault_items where id = '40000000-0000-0000-0000-000000000001') then
    raise exception 'ARCHIVE: historical note was lost';
  end if;
  if (select count(*) from public.vault_note_folders where id in (
    '50000000-0000-0000-0000-0000000000a1',
    '50000000-0000-0000-0000-0000000000b1'
  )) <> 2 then
    raise exception 'ARCHIVE: historical folders were lost';
  end if;
  if (select name from public.vault_note_folders where id = '50000000-0000-0000-0000-0000000000a1') <> 'Research' then
    raise exception 'ARCHIVE: historical folder was modified';
  end if;
end $$;

\echo 'sticky-note-folders retirement and archive assertions passed'
