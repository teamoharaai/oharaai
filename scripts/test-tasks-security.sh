#!/usr/bin/env bash
# Runs the Task foundation migrations and assertions against an isolated local
# PostgreSQL cluster. It never reads Supabase credentials or contacts a linked
# or live project.

set -euo pipefail

TASK_REPOSITORY_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TASK_BOOTSTRAP_PATH="$TASK_REPOSITORY_ROOT/scripts/tasks-security-bootstrap.sql"
TASK_TEST_PATH="$TASK_REPOSITORY_ROOT/scripts/tasks-security.test.sql"
TASK_SCHEDULE_TEST_PATH="$TASK_REPOSITORY_ROOT/scripts/tasks-schedule.test.sql"
TASK_CONCURRENCY_TEST_PATH="$TASK_REPOSITORY_ROOT/scripts/tasks-concurrency.test.sql"
TASK_PRODUCTION_FIXTURE_PATH="$TASK_REPOSITORY_ROOT/scripts/tasks-production-fixture.sql"
TASK_BACKFILL_TEST_PATH="$TASK_REPOSITORY_ROOT/scripts/tasks-backfill.test.sql"
TASK_MIGRATION_045="$TASK_REPOSITORY_ROOT/supabase/migrations/045_goal_lifecycle_foundation.sql"
TASK_MIGRATION_046="$TASK_REPOSITORY_ROOT/supabase/migrations/046_tracker_logs_period_index.sql"
TASK_MIGRATION_047="$TASK_REPOSITORY_ROOT/supabase/migrations/047_tasks_activity_foundation.sql"
TASK_MIGRATION_048="$TASK_REPOSITORY_ROOT/supabase/migrations/048_tasks_legacy_backfill.sql"
TASK_MIGRATION_049="$TASK_REPOSITORY_ROOT/supabase/migrations/049_tasks_new_phase_continuity.sql"
TASK_MIGRATION_050="$TASK_REPOSITORY_ROOT/supabase/migrations/050_tasks_release_cutover_controls.sql"
TASK_NEW_PHASE_TEST_PATH="$TASK_REPOSITORY_ROOT/scripts/tasks-new-phase.test.sql"
TASK_CUTOVER_TEST_PATH="$TASK_REPOSITORY_ROOT/scripts/tasks-cutover.test.sql"

if command -v pg_config >/dev/null 2>&1; then
  TASK_PG_BIN="$(pg_config --bindir)"
elif [[ -d /opt/homebrew/opt/postgresql@16/bin ]]; then
  TASK_PG_BIN="/opt/homebrew/opt/postgresql@16/bin"
else
  echo "PostgreSQL 16+ is required." >&2
  exit 1
fi

for executable in initdb pg_ctl psql; do
  [[ -x "$TASK_PG_BIN/$executable" ]] || { echo "Missing $TASK_PG_BIN/$executable" >&2; exit 1; }
done

TASK_TEST_ROOT="$(mktemp -d "/tmp/ohara-tasks.XXXXXX")"
TASK_DATA_DIR="$TASK_TEST_ROOT/data"
TASK_SOCKET_DIR="$TASK_TEST_ROOT/socket"
mkdir -p "$TASK_SOCKET_DIR"

cleanup() {
  if [[ -d "$TASK_DATA_DIR" ]] && "$TASK_PG_BIN/pg_ctl" -D "$TASK_DATA_DIR" status >/dev/null 2>&1; then
    "$TASK_PG_BIN/pg_ctl" -D "$TASK_DATA_DIR" -m fast -w stop >/dev/null
  fi
  case "$TASK_TEST_ROOT" in
    /tmp/ohara-tasks.*) rm -rf -- "$TASK_TEST_ROOT" ;;
    *) echo "Refusing to clean unexpected test path: $TASK_TEST_ROOT" >&2 ;;
  esac
}
trap cleanup EXIT

"$TASK_PG_BIN/initdb" -D "$TASK_DATA_DIR" -A trust -U postgres --encoding=UTF8 --no-locale >/dev/null
"$TASK_PG_BIN/pg_ctl" -D "$TASK_DATA_DIR" -l "$TASK_TEST_ROOT/postgres.log" \
  -o "-k $TASK_SOCKET_DIR -c listen_addresses='' -c unix_socket_permissions=0700" -w start >/dev/null

PSQL=("$TASK_PG_BIN/psql" -X -v ON_ERROR_STOP=1 -h "$TASK_SOCKET_DIR" -U postgres -d postgres)

echo "Applying isolated production-shaped bootstrap..."
"${PSQL[@]}" -f "$TASK_BOOTSTRAP_PATH" >/dev/null
echo "Applying production-present migration 046..."
"${PSQL[@]}" -f "$TASK_MIGRATION_046" >/dev/null
echo "Loading production-shaped legacy fixture..."
"${PSQL[@]}" -f "$TASK_PRODUCTION_FIXTURE_PATH" >/dev/null
echo "Applying locally pending migration 045..."
"${PSQL[@]}" -f "$TASK_MIGRATION_045" >/dev/null
echo "Applying Task foundation migration 047..."
"${PSQL[@]}" -f "$TASK_MIGRATION_047" >/dev/null
echo "Applying idempotent legacy backfill migration 048..."
"${PSQL[@]}" -f "$TASK_MIGRATION_048" >/dev/null
echo "Applying New Phase Task continuity migration 049..."
"${PSQL[@]}" -f "$TASK_MIGRATION_049" >/dev/null
echo "Applying Task release cutover controls migration 050..."
"${PSQL[@]}" -f "$TASK_MIGRATION_050" >/dev/null
echo "Running production-shaped legacy backfill assertions..."
"${PSQL[@]}" -f "$TASK_BACKFILL_TEST_PATH"
echo "Rerunning migration 048 to prove backfill idempotency..."
"${PSQL[@]}" -f "$TASK_MIGRATION_048" >/dev/null
"${PSQL[@]}" -f "$TASK_BACKFILL_TEST_PATH" >/dev/null
echo "Running Task foundation security and behavior assertions..."
"${PSQL[@]}" -f "$TASK_TEST_PATH"
echo "Running concurrent reconciliation and mutation retries..."
TASK_RECONCILE_SQL="set role authenticated; select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-00000000000a',false); select public.reconcile_task_occurrences_v1((select id from public.tasks where create_idempotency_key='create:weekly'), current_date+90);"
TASK_QUANTITY_SQL="set role authenticated; select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-00000000000a',false); select public.adjust_task_occurrence_quantity_v1((select occurrence.id from public.task_occurrences occurrence join public.tasks task on task.id=occurrence.task_id where task.create_idempotency_key='create:quantity' limit 1),1,'quantity:concurrent');"
"${PSQL[@]}" -c "$TASK_RECONCILE_SQL" >/dev/null &
TASK_RECONCILE_PID_ONE=$!
"${PSQL[@]}" -c "$TASK_RECONCILE_SQL" >/dev/null &
TASK_RECONCILE_PID_TWO=$!
wait "$TASK_RECONCILE_PID_ONE"
wait "$TASK_RECONCILE_PID_TWO"
"${PSQL[@]}" -c "$TASK_QUANTITY_SQL" >/dev/null &
TASK_QUANTITY_PID_ONE=$!
"${PSQL[@]}" -c "$TASK_QUANTITY_SQL" >/dev/null &
TASK_QUANTITY_PID_TWO=$!
wait "$TASK_QUANTITY_PID_ONE"
wait "$TASK_QUANTITY_PID_TWO"
"${PSQL[@]}" -f "$TASK_CONCURRENCY_TEST_PATH"
echo "Running Task recurrence, timezone, and schedule-version assertions..."
"${PSQL[@]}" -f "$TASK_SCHEDULE_TEST_PATH"
echo "Running New Phase canonical Task continuity assertions..."
"${PSQL[@]}" -f "$TASK_NEW_PHASE_TEST_PATH"
echo "Running late-write cutover, verification, freeze, and rollback assertions..."
"${PSQL[@]}" -f "$TASK_CUTOVER_TEST_PATH"
echo "Task foundation database harness passed."
