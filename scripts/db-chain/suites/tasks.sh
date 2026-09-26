#!/usr/bin/env bash
# Task foundation (Migrations 047-051) on the real chain, in the order the retired harness used:
# the production-shaped legacy fixture is loaded on the chain through 046, before 047-051 run their
# backfill over it; the assertions then run at the 051 state they were written for.
# Run with `npm run test:tasks:db` or `bash scripts/db-chain/run.sh suites/tasks` (SUITES entry: chain through 046).
source "$(dirname "${BASH_SOURCE[0]}")/../lib.sh"
S="$REPOSITORY_ROOT/scripts"

echo "Loading production-shaped legacy fixture on the chain through 046..."
quiet_sql "$S/tasks-production-fixture.sql" "loading the Task legacy fixture"
echo "Applying 047-051 (Goal lifecycle, Task foundation, legacy backfill, New Phase continuity, cutover controls)..."
continue_chain 051
echo "Running production-shaped legacy backfill assertions..."
"${PSQL[@]}" -f "$S/tasks-backfill.test.sql"
echo "Rerunning migration 049 to prove backfill idempotency..."
apply_migration 049
"${PSQL[@]}" -f "$S/tasks-backfill.test.sql" >/dev/null
echo "Running Task foundation security and behavior assertions..."
"${PSQL[@]}" -f "$S/tasks-security.test.sql"
echo "Running concurrent reconciliation and mutation retries..."
RECONCILE_SQL="set role authenticated; select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-00000000000a',false); select public.reconcile_task_occurrences_v1((select id from public.tasks where create_idempotency_key='create:weekly'), current_date+90);"
QUANTITY_SQL="set role authenticated; select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-00000000000a',false); select public.adjust_task_occurrence_quantity_v1((select occurrence.id from public.task_occurrences occurrence join public.tasks task on task.id=occurrence.task_id where task.create_idempotency_key='create:quantity' limit 1),1,'quantity:concurrent');"
"${PSQL[@]}" -c "$RECONCILE_SQL" >/dev/null & first=$!
"${PSQL[@]}" -c "$RECONCILE_SQL" >/dev/null & second=$!
wait "$first"; wait "$second"
"${PSQL[@]}" -c "$QUANTITY_SQL" >/dev/null & first=$!
"${PSQL[@]}" -c "$QUANTITY_SQL" >/dev/null & second=$!
wait "$first"; wait "$second"
"${PSQL[@]}" -f "$S/tasks-concurrency.test.sql"
echo "Running Task recurrence, timezone, and schedule-version assertions..."
"${PSQL[@]}" -f "$S/tasks-schedule.test.sql"
echo "Running New Phase canonical Task continuity assertions..."
"${PSQL[@]}" -f "$S/tasks-new-phase.test.sql"
echo "Running late-write cutover, verification, freeze, and rollback assertions..."
"${PSQL[@]}" -f "$S/tasks-cutover.test.sql"
echo "Task foundation database harness passed."
