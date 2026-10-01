-- Phase 3: retire the legacy Sticky Note product surface without deleting or
-- converting user data. Historical rows and media remain readable as an
-- archive compatibility layer; every legacy writer is frozen.

begin;

create or replace function public.prevent_retired_sticky_note_write_v1()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if (tg_op = 'INSERT' and new.content_kind = 'sticky_note')
     or (tg_op = 'UPDATE' and (old.content_kind = 'sticky_note' or new.content_kind = 'sticky_note')) then
    raise exception 'Retired content is read-only';
  end if;
  return new;
end;
$$;

drop trigger if exists prevent_retired_sticky_note_write_v1 on public.vault_items;
create trigger prevent_retired_sticky_note_write_v1
before insert or update on public.vault_items
for each row execute function public.prevent_retired_sticky_note_write_v1();

revoke all on function public.prevent_retired_sticky_note_write_v1()
  from public, anon, authenticated;

-- These folders exist only for the retired cards. Keep their rows and SELECT
-- compatibility, but prevent new organization state from being written.
revoke insert, update, delete on table public.vault_note_folders from authenticated;

-- Keep historical media readable by its owner while freezing uploads,
-- replacements, and deletes. The bucket and objects remain intact.
drop policy if exists "Users can insert own goal note photos" on storage.objects;
drop policy if exists "Users can update own goal note photos" on storage.objects;
drop policy if exists "Users can delete own goal note photos" on storage.objects;

comment on column public.vault_items.content_kind is
  'Durable compatibility classification. sticky_note rows are retired, hidden, and read-only; generic remains active.';
comment on table public.vault_note_folders is
  'Read-only compatibility archive for retired Sticky Note organization. Rows are preserved for later export or migration.';

commit;
