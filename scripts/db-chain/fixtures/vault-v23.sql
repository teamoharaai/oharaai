-- Production-shaped Vault rows as they existed before Migration 070 (loaded on the chain through 069).
-- Same rows and IDs as the retired vault-v23-security-bootstrap.sql, now in the real tables.
insert into auth.users(id) values
  ('11111111-1111-4111-8111-111111111111'),
  ('22222222-2222-4222-8222-222222222222');
insert into public.goals(id,user_id,title,category) values
  ('20000000-0000-4000-8000-000000000001','11111111-1111-4111-8111-111111111111','Owner Goal','Work & Money'),
  ('20000000-0000-4000-8000-000000000002','22222222-2222-4222-8222-222222222222','Other Goal','Work & Money');

insert into public.vaults(id,user_id,goal_id) values
('10000000-0000-4000-8000-000000000001','11111111-1111-4111-8111-111111111111','20000000-0000-4000-8000-000000000001'),
('10000000-0000-4000-8000-000000000002','22222222-2222-4222-8222-222222222222','20000000-0000-4000-8000-000000000002');

insert into public.vault_items(id,vault_id,item_type,title,metadata,created_by) values
('30000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','note','Migrated sticky','{"migratedFrom":"goal_notes","legacyId":"legacy-1","photoUrl":"owner/photo.jpg"}','11111111-1111-4111-8111-111111111111'),
('30000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001','note','Generic note','{}','11111111-1111-4111-8111-111111111111'),
('30000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000001','note','Ambiguous provenance','{"migratedFrom":"goal_notes"}','11111111-1111-4111-8111-111111111111'),
('30000000-0000-4000-8000-000000000004','10000000-0000-4000-8000-000000000002','note','Other owner private','{"migratedFrom":"goal_notes","legacyId":"legacy-2"}','22222222-2222-4222-8222-222222222222');
