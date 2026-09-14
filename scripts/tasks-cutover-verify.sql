\set ON_ERROR_STOP on

-- Read-only, aggregate-only release verification. Execute as service_role.
-- No titles, notes, action text, user IDs, or other user content are returned.
select
  source_name,
  source_rows,
  mapped_rows,
  unmapped_rows,
  duplicate_mappings
from public.verify_tasks_legacy_cutover_v1();
