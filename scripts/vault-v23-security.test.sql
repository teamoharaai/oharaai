\set ON_ERROR_STOP on

do $$
declare archived_before jsonb;
begin
  if (select content_kind from public.vault_items where id='30000000-0000-4000-8000-000000000001') <> 'sticky_note' then
    raise exception 'migration-proven Sticky Note was not classified';
  end if;
  if exists (select 1 from public.vault_items where id in ('30000000-0000-4000-8000-000000000002','30000000-0000-4000-8000-000000000003') and content_kind <> 'generic') then
    raise exception 'generic or ambiguous note was misclassified';
  end if;
  select to_jsonb(vi) into archived_before from public.vault_items vi
  where id='30000000-0000-4000-8000-000000000001';
  begin
    update public.vault_items set content_kind='generic' where id='30000000-0000-4000-8000-000000000001';
    raise exception 'classification mutation unexpectedly succeeded';
  exception when raise_exception then
    if sqlerrm not in ('Retired content is read-only', 'Vault item content kind is immutable') then raise; end if;
  end;
  begin
    update public.vault_items set metadata='{"photoUrl":"owner/replacement.jpg"}' where id='30000000-0000-4000-8000-000000000001';
    raise exception 'archived metadata mutation unexpectedly succeeded';
  exception when raise_exception then
    if sqlerrm <> 'Retired content is read-only' then raise; end if;
  end;
  begin
    insert into public.vault_items(vault_id,item_type,content_kind,title,created_by)
    values ('10000000-0000-4000-8000-000000000001','note','sticky_note','new retired item','11111111-1111-4111-8111-111111111111');
    raise exception 'retired insert unexpectedly succeeded';
  exception when raise_exception then
    if sqlerrm <> 'Retired content is read-only' then raise; end if;
  end;
  if archived_before is distinct from (
    select to_jsonb(vi) from public.vault_items vi where id='30000000-0000-4000-8000-000000000001'
  ) then
    raise exception 'archived row changed during retirement checks';
  end if;
  update public.vault_items set title='Generic note retained' where id='30000000-0000-4000-8000-000000000002';
end $$;

begin;
set local role authenticated;
set local "request.jwt.claim.sub" = '11111111-1111-4111-8111-111111111111';
do $$
begin
  if (select count(*) from public.vault_items) <> 3 then
    raise exception 'owner visibility or cross-user denial failed';
  end if;
  if exists (select 1 from public.vault_items where title='Other owner private') then
    raise exception 'cross-user private Sticky Note leaked';
  end if;
end $$;
rollback;

select 'Vault classification, retirement freeze, preservation, and owner isolation assertions passed.' as result;
