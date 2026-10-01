-- Migration 084 is non-destructive: historical rows/media remain, while every
-- authenticated write boundary for the retired content is closed.
do $$
declare
  trigger_definition text;
begin
  if not exists (
    select 1 from pg_trigger
    where tgrelid = 'public.vault_items'::regclass
      and tgname = 'prevent_retired_sticky_note_write_v1'
      and not tgisinternal
  ) then
    raise exception 'STICKY_RETIREMENT_TRIGGER_MISSING';
  end if;

  select pg_get_functiondef('public.prevent_retired_sticky_note_write_v1()'::regprocedure)
    into trigger_definition;
  if lower(trigger_definition) not like '%retired content is read-only%'
     or lower(trigger_definition) not like '%old.content_kind = ''sticky_note''%'
     or lower(trigger_definition) not like '%new.content_kind = ''sticky_note''%' then
    raise exception 'STICKY_RETIREMENT_TRIGGER_INVALID';
  end if;

  if has_table_privilege('authenticated', 'public.vault_note_folders', 'INSERT')
     or has_table_privilege('authenticated', 'public.vault_note_folders', 'UPDATE')
     or has_table_privilege('authenticated', 'public.vault_note_folders', 'DELETE') then
    raise exception 'STICKY_FOLDER_WRITES_REMAIN_OPEN';
  end if;

  if exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname in (
        'Users can insert own goal note photos',
        'Users can update own goal note photos',
        'Users can delete own goal note photos'
      )
  ) then
    raise exception 'STICKY_MEDIA_WRITES_REMAIN_OPEN';
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'Users can read own goal note photos'
  ) then
    raise exception 'STICKY_MEDIA_ARCHIVE_READ_MISSING';
  end if;
end $$;
