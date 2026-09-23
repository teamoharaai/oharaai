\set ON_ERROR_STOP on

do $$
begin
  if (select content_kind from public.vault_items where id='30000000-0000-4000-8000-000000000001') <> 'sticky_note' then
    raise exception 'migration-proven Sticky Note was not classified';
  end if;
  if exists (select 1 from public.vault_items where id in ('30000000-0000-4000-8000-000000000002','30000000-0000-4000-8000-000000000003') and content_kind <> 'generic') then
    raise exception 'generic or ambiguous note was misclassified';
  end if;
  begin
    update public.vault_items set content_kind='generic' where id='30000000-0000-4000-8000-000000000001';
    raise exception 'classification mutation unexpectedly succeeded';
  exception when raise_exception then
    if sqlerrm <> 'Vault item content kind is immutable' then raise; end if;
  end;
  update public.vault_items set metadata='{"photoUrl":"owner/replacement.jpg"}' where id='30000000-0000-4000-8000-000000000001';
  if (select content_kind from public.vault_items where id='30000000-0000-4000-8000-000000000001') <> 'sticky_note' then
    raise exception 'photo metadata update erased classification';
  end if;
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

select 'Vault V2.3 classification and owner isolation assertions passed.' as result;
