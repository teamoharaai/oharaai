#!/usr/bin/env bash
# Rehearses `scripts/test-manual-goal-hosted.mjs --apply` locally, on the real chain stopped where hosted is
# (HOSTED_APPLIED_THROUGH) with production-shaped rows loaded (fixtures/apply-rehearsal-seed.sql). Proves, in order:
#   1. a pending migration that changes an existing row aborts the apply, and nothing is kept;
#   2. a redundant scheduled occurrence 076 would cancel blocks the apply before anything runs (exit 2);
#   3. the real apply commits: history is the full local chain, existing rows are unchanged, no probe row is left;
#   4. running it again is refused by the history guard.
#
#   HOSTED_APPLIED_THROUGH  override the last migration hosted has applied (default: scripts/db-chain/hosted-applied-through,
#                           which a deploy updates)
#   OHARA_NODE / OHARA_PG_BIN / OHARA_DEFAULT_ACL as for run.sh
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
THROUGH="${HOSTED_APPLIED_THROUGH:-$(tr -d "[:space:]" < "$ROOT_DIR/scripts/db-chain/hosted-applied-through")}"
if ! ls "$ROOT_DIR/supabase/migrations"/[0-9][0-9][0-9]_*.sql | sed -E "s|.*/([0-9]{3})_.*|\1|" | awk -v t="$THROUGH" "\$1 > t { found = 1 } END { exit !found }"; then
  echo "Nothing pending after $THROUGH (hosted is current); skipped."; exit 0
fi
NODE="${OHARA_NODE:-$(command -v node || true)}"
[[ -n "$NODE" ]] || { echo "node is required (set OHARA_NODE)." >&2; exit 1; }

output="$(bash "$ROOT_DIR/scripts/db-chain/run.sh" --chain-only --keep --through "$THROUGH")"
echo "$output" | grep -E "^(Applying|Chain applied)"
env_line="$(echo "$output" | sed -n 's/^Env:  export //p')"
stop_line="$(echo "$output" | sed -n 's/^Stop: //p')"
[[ -n "$env_line" && -n "$stop_line" ]] || { echo "Could not read the kept cluster from run.sh" >&2; exit 1; }
WORK="$(mktemp -d /tmp/ohara-apply-rehearsal.XXXXXX)"
trap 'eval "$stop_line"; rm -rf -- "$WORK"' EXIT
export $env_line

sql() { "$GOAL_TEST_PSQL" -X -q -At -v ON_ERROR_STOP=1 -h "$GOAL_TEST_SOCKET" -p "$GOAL_TEST_PORT" -U postgres -d "$GOAL_TEST_DB" "$@"; }
# Everything --apply must leave alone, plus the history, in one comparable line.
state() {
  sql -c "select (select string_agg(version || ' ' || name, ',' order by version) from supabase_migrations.schema_migrations)
    || ' | ' || (select md5(string_agg(t::text, ',' order by t::text)) from (
      select to_jsonb(g)::text t from public.goals g union all select to_jsonb(m)::text from public.milestones m
      union all select to_jsonb(k)::text from public.tasks k union all select to_jsonb(s)::text from public.task_schedules s
      union all select to_jsonb(o)::text from public.task_occurrences o) rows)
    || ' | probe users ' || (select count(*) from auth.users where email like '%probe%')"
}
run_apply() { # <expected exit> <label> [env assignments...]
  local expected="$1" label="$2" status=0; shift 2
  env "$@" "$NODE" "$ROOT_DIR/scripts/test-manual-goal-hosted.mjs" --local --applied-through "$THROUGH" --apply >"$WORK/apply.log" 2>&1 || status=$?
  if [[ "$status" != "$expected" ]]; then
    echo "FAIL: $label exited $status, expected $expected:" >&2; tail -20 "$WORK/apply.log" >&2; exit 1
  fi
  grep -E "APPLY_|PREFLIGHT_HISTORY|^(BLOCKED|PASS|FAIL)" "$WORK/apply.log" | cut -c1-200 | sed "s/^/  /"
}
unchanged() { # <label>
  [[ "$(state)" == "$before" ]] || { echo "FAIL: $1 changed the target" >&2; exit 1; }
}

sql -f "$ROOT_DIR/scripts/db-chain/fixtures/apply-rehearsal-seed.sql"
before="$(state)"

echo "1. A pending migration that changes an existing row"
cp -R "$ROOT_DIR/supabase/migrations" "$WORK/defect"
last="$(ls "$WORK/defect"/[0-9][0-9][0-9]_*.sql | tail -1)"
perl -0pi -e "s/\ncommit;\s*\z/\nupdate public.goals set title = title || ' (changed)';\ncommit;\n/i" "$last"
run_apply 1 "seeded defect" OHARA_MIGRATIONS_DIR="$WORK/defect"
grep -q APPLY_INVARIANT_CHANGED "$WORK/apply.log" || { echo "FAIL: the invariant did not catch the change" >&2; exit 1; }
unchanged "the aborted apply"

if [[ "$THROUGH" < 076 ]]; then
  echo "2. A redundant scheduled occurrence 076 would cancel"
  sql -c "insert into public.task_occurrences(user_id, task_id, schedule_id, occurrence_key, scheduled_local_date, status, source)
    select user_id, task_id, schedule_id, 'seed-duplicate', scheduled_local_date, 'pending', source from public.task_occurrences where occurrence_key = 'seed-2'"
  run_apply 2 "unclean 076 pre-check"
  sql -c "delete from public.task_occurrences where occurrence_key = 'seed-duplicate'"
  unchanged "the blocked apply"
fi

echo "3. The real apply"
run_apply 0 "apply"
expected_history="$(cd "$ROOT_DIR/supabase/migrations" && ls [0-9][0-9][0-9]_*.sql | sed -E 's/^([0-9]{3})_(.*)\.sql$/\1 \2/' | paste -sd, -)"
after="$(state)"
[[ "${after%% | *}" == "$expected_history" ]] || { echo "FAIL: history after apply is not the full local chain" >&2; exit 1; }
[[ "${after#* | }" == "${before#* | }" ]] || { echo "FAIL: the apply changed existing rows or left probe rows" >&2; exit 1; }

echo "4. Running it again"
before="$after"
run_apply 1 "second apply"
unchanged "the refused apply"

echo "PASS: apply rehearsal on the chain through $THROUGH (defect aborted, unclean pre-check blocked, apply committed, rerun refused)"
