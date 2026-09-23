-- Goals V2.3: durable Vault item classification.
--
-- `item_type = 'note'` predates Sticky Notes and is not sufficient to prove
-- that an item is a Sticky Note. Keep generic Vault notes generic and only
-- backfill rows whose migration provenance proves they came from goal_notes.
alter table public.vault_items
  add column if not exists content_kind text not null default 'generic';

alter table public.vault_items
  drop constraint if exists vault_items_content_kind_check;

alter table public.vault_items
  add constraint vault_items_content_kind_check
  check (
    content_kind in ('generic', 'sticky_note')
    and (content_kind <> 'sticky_note' or item_type = 'note')
  );

update public.vault_items
set content_kind = 'sticky_note'
where item_type = 'note'
  and metadata->>'migratedFrom' = 'goal_notes'
  and nullif(metadata->>'legacyId', '') is not null;

create or replace function public.preserve_vault_item_content_kind()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if new.content_kind is distinct from old.content_kind then
    raise exception 'Vault item content kind is immutable';
  end if;
  return new;
end;
$$;

drop trigger if exists preserve_vault_item_content_kind on public.vault_items;
create trigger preserve_vault_item_content_kind
before update on public.vault_items
for each row execute function public.preserve_vault_item_content_kind();

revoke all on function public.preserve_vault_item_content_kind() from public, anon, authenticated;

comment on column public.vault_items.content_kind is
  'Durable content classification. sticky_note is explicit and immutable; generic is the safe default.';
