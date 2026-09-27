-- When hosted is already at Migration 078, apply-rehearsal-seed.sql is loaded
-- after the ledger migration. Mirror the production state that 078 created by
-- copying the seeded legacy receipts into the canonical operation ledger.
insert into goal_private.operation_ledger(owner_id, operation_id, seq, protocol, operation_type, goal_id, digest, state,
  reason, revision, recorded_at, terminal_at, acknowledged_at, goal_version, admission_deadline, reviewed_revision, reviewed_resolver)
select owner_id, operation_id, seq, 'goal.create', case when digest is not null then 'goal.create.manual' end, goal_id, digest, state,
  reason, revision, first_recorded_at, terminal_at, acknowledged_at, goal_version, admission_deadline, reviewed_revision, reviewed_resolver
from goal_private.operations;

with later as (
  select 'goal.mutate' as protocol, owner_id, operation_id, operation_type, goal_id, null::uuid as entity_id, digest, state,
    reason, recorded_at, acknowledged_at, goal_version, expected_version from goal_private.goal_mutations
  union all
  select 'goal.work', owner_id, operation_id, operation_type, goal_id, entity_id, digest, state,
    reason, recorded_at, null, null, null from goal_private.work_mutations
)
insert into goal_private.operation_ledger(owner_id, operation_id, seq, protocol, operation_type, goal_id, entity_id, digest, state,
  reason, recorded_at, terminal_at, acknowledged_at, goal_version, expected_version)
select l.owner_id, l.operation_id,
  c.last_seq + row_number() over (partition by l.owner_id order by l.recorded_at, l.protocol, l.operation_id),
  l.protocol, l.operation_type, l.goal_id, l.entity_id, l.digest, l.state, l.reason, l.recorded_at, l.recorded_at,
  l.acknowledged_at, l.goal_version, l.expected_version
from later l join goal_private.counters c on c.owner_id = l.owner_id;

update goal_private.counters c set last_seq = m.last
from (select owner_id, max(seq) as last from goal_private.operation_ledger group by owner_id) m
where m.owner_id = c.owner_id and m.last > c.last_seq;
