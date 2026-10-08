#!/usr/bin/env bash
# Full-chain database tests (TD-001).
#
# Builds a disposable PostgreSQL cluster in /tmp, loads the Supabase platform
# stand-in (scripts/db-chain/supabase-platform.sql), applies every migration in
# supabase/migrations in order as the non-superuser `postgres` role, and runs
# the database suites against copies of that real chain. No Docker, no
# Supabase CLI, no credentials, and it never contacts a linked or live project.
#
# Usage:
#   bash scripts/db-chain/run.sh               # chain + every suite
#   bash scripts/db-chain/run.sh --chain-only  # only prove the chain applies
#   bash scripts/db-chain/run.sh goal-work     # suites whose path contains it
#   bash scripts/db-chain/run.sh --chain-only --keep  # leave the cluster up to inspect
#   bash scripts/db-chain/run.sh --chain-only --keep --through 073  # stop after 073 (preflight rehearsal)
#
# Environment:
#   OHARA_PG_BIN       PostgreSQL bin dir with pgvector and pg_cron (default: Homebrew 17)
#   OHARA_DEFAULT_ACL  hosted (default) | cli, see supabase-platform.sql
#   OHARA_NODE         node binary (default: node on PATH)
#   OHARA_MIGRATIONS_DIR  migrations to apply (default: supabase/migrations);
#                      used to prove the harness catches a seeded defect
#
# Suites receive one env contract: GOAL_TEST_SOCKET, GOAL_TEST_PORT,
# GOAL_TEST_DB, GOAL_TEST_PSQL and PGUSER=postgres.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
MIGRATIONS_DIR="${OHARA_MIGRATIONS_DIR:-$ROOT_DIR/supabase/migrations}"
PLATFORM_SQL="$ROOT_DIR/scripts/db-chain/supabase-platform.sql"
DEFAULT_ACL="${OHARA_DEFAULT_ACL:-hosted}"
NODE="${OHARA_NODE:-$(command -v node || true)}"
PORT=55450
export LC_ALL="${LC_ALL:-en_US.UTF-8}"

# Suites: "<test file>:<through>", where <through> is "all" or the last
# migration number the suite expects to be applied before it starts.
SUITES=(
  "lib/goals/manual-v1-db.test.mjs:all"
  "lib/goals/goal-card-v1-db.test.mjs:all"
  "lib/goals/goal-work-v1-db.test.mjs:all"
  "lib/goals/task-schedule-continuity-db.test.mjs:075"
  "lib/goals/operation-ledger-db.test.mjs:all"
  "lib/goals/goal-events-db.test.mjs:079"
  "scripts/db-chain/suites/vault-v23.sh:069"
  "scripts/db-chain/suites/sticky-note-folders.sh:all"
  "scripts/db-chain/suites/notes-editor.sh:all"
  "scripts/db-chain/suites/circles.sh:all"
  "scripts/db-chain/suites/momentum.sh:all"
  "scripts/db-chain/suites/constellation.sh:all"
  "scripts/db-chain/suites/tasks.sh:046"
  "scripts/db-chain/suites/projects-v1.sh:all"
  "scripts/db-chain/suites/projects-v11.sh:all"
  "scripts/db-chain/suites/calendar.sh:all"
)

CHAIN_ONLY=false
KEEP=false
FILTER=""
THROUGH=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --chain-only) CHAIN_ONLY=true ;;
    --keep) KEEP=true ;;
    --through)
      THROUGH="${2:-}"; shift
      [[ "$THROUGH" =~ ^[0-9]{3}$ ]] || { echo "--through needs a migration number, e.g. 073" >&2; exit 2; } ;;
    -*) echo "Unknown option: $1" >&2; exit 2 ;;
    *) FILTER="$1" ;;
  esac
  shift
done
if [[ -n "$THROUGH" ]] && ! $CHAIN_ONLY; then
  echo "--through stops the chain early, so it needs --chain-only (suites expect the full chain)." >&2
  exit 2
fi

# PostgreSQL with pgvector and pg_cron ------------------------------------------
if [[ -n "${OHARA_PG_BIN:-}" ]]; then
  PG_BIN="$OHARA_PG_BIN"
elif [[ -d /opt/homebrew/opt/postgresql@17/bin ]]; then
  PG_BIN=/opt/homebrew/opt/postgresql@17/bin
elif command -v pg_config >/dev/null 2>&1; then
  PG_BIN="$(pg_config --bindir)"
else
  echo "PostgreSQL 15+ with pgvector is required (macOS: brew install postgresql@17 pgvector)." >&2
  exit 1
fi
for executable in initdb pg_ctl psql pg_config; do
  [[ -x "$PG_BIN/$executable" ]] || { echo "Missing $PG_BIN/$executable" >&2; exit 1; }
done
if [[ ! -f "$("$PG_BIN/pg_config" --sharedir)/extension/vector.control" ]]; then
  echo "pgvector is not installed for $PG_BIN (macOS: brew install pgvector)." >&2
  exit 1
fi
if [[ ! -f "$("$PG_BIN/pg_config" --sharedir)/extension/pg_cron.control" ]]; then
  echo "pg_cron is not installed for $PG_BIN (macOS: brew install pg_cron; Debian: postgresql-17-cron)." >&2
  exit 1
fi
# Disposable cluster ------------------------------------------------------------
# The /tmp/ohara-goal- prefix is what the suites accept as disposable.
TEST_ROOT="$(mktemp -d /tmp/ohara-goal-chain.XXXXXX)"
DATA_DIR="$TEST_ROOT/data"
SOCKET_DIR="$TEST_ROOT/socket"
mkdir -p "$SOCKET_DIR"

cleanup() {
  if $KEEP; then
    echo "Kept: $PG_BIN/psql -h $SOCKET_DIR -p $PORT -U postgres -d chain"
    echo "Env:  export GOAL_TEST_SOCKET=$SOCKET_DIR GOAL_TEST_PORT=$PORT GOAL_TEST_DB=chain GOAL_TEST_PSQL=$PG_BIN/psql"
    echo "Stop: $PG_BIN/pg_ctl -D $DATA_DIR stop && rm -rf $TEST_ROOT"
    return
  fi
  local data
  for data in "$DATA_DIR" "$TEST_ROOT"/suite_*/data; do
    if [[ -d "$data" ]] && "$PG_BIN/pg_ctl" -D "$data" status >/dev/null 2>&1; then
      "$PG_BIN/pg_ctl" -D "$data" -m fast -w stop >/dev/null
    fi
  done
  case "$TEST_ROOT" in
    /tmp/ohara-goal-chain.*) rm -rf -- "$TEST_ROOT" ;;
    *) echo "Refusing to clean unexpected test path: $TEST_ROOT" >&2 ;;
  esac
}
trap cleanup EXIT

start_cluster() { # <data dir> <socket dir>
  # pg_cron is preloaded as on hosted (CREATE EXTENSION requires it), but its scheduler never starts
  # (max_worker_processes=0): suites run jobs directly, and an idle scheduler session on `chain` would
  # block the template copies below.
  "$PG_BIN/pg_ctl" -D "$1" -l "$1/../postgres.log" \
    -o "-k $2 -p $PORT -c listen_addresses='' -c unix_socket_permissions=0700 -c shared_preload_libraries=pg_cron -c cron.database_name=chain -c max_worker_processes=0" \
    -w start >/dev/null
}
stop_cluster() { "$PG_BIN/pg_ctl" -D "$1" -m fast -w stop >/dev/null; }

"$PG_BIN/initdb" -D "$DATA_DIR" -A trust -U supabase_admin --encoding=UTF8 --locale=en_US.UTF-8 >/dev/null
start_cluster "$DATA_DIR" "$SOCKET_DIR"

psql_as() { # <role> <database> [psql args...]
  local role="$1" database="$2"; shift 2
  "$PG_BIN/psql" -X -q -v ON_ERROR_STOP=1 -h "$SOCKET_DIR" -p "$PORT" -U "$role" -d "$database" "$@"
}

apply_file() { # <role> <database> <file>
  local log="$TEST_ROOT/apply.log"
  if ! psql_as "$1" "$2" -f "$3" >"$log" 2>&1; then
    echo "FAILED applying $(basename "$3") as $1:" >&2
    grep -vE "^(NOTICE|psql:.*NOTICE)" "$log" | head -20 >&2
    exit 1
  fi
}

# Platform ----------------------------------------------------------------------
psql_as supabase_admin postgres -c "create role postgres login createrole createdb replication bypassrls" \
  -c "create database chain owner postgres"
psql_as supabase_admin chain -v DBNAME=chain -v DEFAULT_ACL="$DEFAULT_ACL" -f "$PLATFORM_SQL" >/dev/null

# Which snapshots do the selected suites need? -----------------------------------
# Node suites get a template database. Shell suites may continue the chain, and roles are cluster-wide
# (a copied database can't re-run 072's CREATE ROLE), so each gets its own cluster copied from a
# stopped data-directory snapshot.
declare -a SELECTED=()
SNAPSHOTS=" "
CLUSTER_SNAPSHOTS=" "
for entry in "${SUITES[@]}"; do
  file="${entry%%:*}"; through="${entry##*:}"
  [[ -z "$FILTER" || "$file" == *"$FILTER"* ]] || continue
  SELECTED+=("$entry")
  if [[ "$file" == *.sh ]]; then CLUSTER_SNAPSHOTS+="$through "
  elif [[ "$through" != all ]]; then SNAPSHOTS+="$through "; fi
  if ! $CHAIN_ONLY && [[ "$file" == *.mjs && -z "$NODE" ]]; then
    echo "node is required to run $file (set OHARA_NODE)." >&2
    exit 1
  fi
done
if ! $CHAIN_ONLY && [[ ${#SELECTED[@]} -eq 0 ]]; then
  echo "No suite matches '$FILTER'." >&2
  exit 2
fi

# Migrations --------------------------------------------------------------------
shopt -s nullglob
MIGRATIONS=("$MIGRATIONS_DIR"/[0-9][0-9][0-9]_*.sql)
if [[ -n "$THROUGH" ]]; then
  # Stop early, e.g. at the state a hosted project is at, for the rollback-only preflight rehearsal.
  kept=()
  for migration in "${MIGRATIONS[@]}"; do
    name="$(basename "$migration")"; [[ "${name%%_*}" > "$THROUGH" ]] || kept+=("$migration")
  done
  MIGRATIONS=("${kept[@]}")
  [[ "$(basename "${MIGRATIONS[${#MIGRATIONS[@]}-1]}")" == "$THROUGH"_* ]] || { echo "No migration $THROUGH in $MIGRATIONS_DIR" >&2; exit 2; }
fi
echo "Applying ${#MIGRATIONS[@]} migrations to a Supabase-shaped PostgreSQL $("$PG_BIN/pg_config" --version | awk '{print $2}') (default ACL: $DEFAULT_ACL)..."
for migration in "${MIGRATIONS[@]}"; do
  name="$(basename "$migration")"; number="${name%%_*}"
  if [[ "$number" == 001 ]]; then
    # Hosted runs 001 as postgres, with supautils permitting its event trigger.
    psql_as supabase_admin chain -c "alter role postgres superuser"
    apply_file postgres chain "$migration"
    psql_as supabase_admin chain -c "alter role postgres nosuperuser" \
      -c "alter event trigger ensure_rls owner to supabase_admin"
  else
    apply_file postgres chain "$migration"
  fi
  # Record it as `supabase db push` does, so the chain's history matches hosted.
  psql_as postgres chain -c "insert into supabase_migrations.schema_migrations(version, name) values ('$number', '$(basename "$name" .sql | cut -d_ -f2-)')"
  if [[ "$SNAPSHOTS" == *" $number "* ]]; then
    psql_as supabase_admin postgres -c "create database chain_$number template chain owner postgres"
  fi
  if [[ "$CLUSTER_SNAPSHOTS" == *" $number "* ]]; then
    stop_cluster "$DATA_DIR"; cp -Rp "$DATA_DIR" "$TEST_ROOT/data_$number"; start_cluster "$DATA_DIR" "$SOCKET_DIR"
  fi
done
LAST_MIGRATION="${MIGRATIONS[${#MIGRATIONS[@]}-1]##*/}"
if [[ "$CLUSTER_SNAPSHOTS" == *" all "* ]] && ! $CHAIN_ONLY; then
  stop_cluster "$DATA_DIR"; cp -Rp "$DATA_DIR" "$TEST_ROOT/data_all"; start_cluster "$DATA_DIR" "$SOCKET_DIR"
fi
echo "Chain applied: ${MIGRATIONS[0]##*/} .. $LAST_MIGRATION"
$CHAIN_ONLY && exit 0

# Suites ------------------------------------------------------------------------
cd "$ROOT_DIR"
failed=()
index=0
for entry in "${SELECTED[@]}"; do
  file="${entry%%:*}"; through="${entry##*:}"
  index=$((index + 1))
  at="${LAST_MIGRATION%%_*}"; [[ "$through" == all ]] || at="$through"
  if [[ "$file" == *.sh ]]; then
    # Shell suites (scripts/db-chain/suites/) get their own cluster and source lib.sh, which can load
    # fixtures and then continue the real chain from CHAIN_AT.
    suite_root="$TEST_ROOT/suite_$index"
    mkdir -p "$suite_root/socket"; cp -Rp "$TEST_ROOT/data_$through" "$suite_root/data"
    start_cluster "$suite_root/data" "$suite_root/socket"
    socket="$suite_root/socket"; database=chain; runner=(bash)
    echo; echo "== $file (own cluster, chain through $at)"
  else
    template=chain; [[ "$through" == all ]] || template="chain_$through"
    database="suite_$index"; socket="$SOCKET_DIR"; runner=("$NODE" --test)
    psql_as supabase_admin postgres -c "create database $database template $template owner postgres"
    echo; echo "== $file (on $template)"
  fi
  if GOAL_TEST_SOCKET="$socket" GOAL_TEST_PORT="$PORT" GOAL_TEST_DB="$database" \
     GOAL_TEST_PSQL="$PG_BIN/psql" PGUSER=postgres \
     CHAIN_AT="$at" CHAIN_MIGRATIONS_DIR="$MIGRATIONS_DIR" CHAIN_TMP="${suite_root:-$TEST_ROOT}" \
     "${runner[@]}" "$file"; then
    :
  else
    failed+=("$file")
  fi
  if [[ "$file" == *.sh ]]; then stop_cluster "$suite_root/data"; rm -rf -- "$suite_root"; unset suite_root; fi
done

echo
if [[ ${#failed[@]} -gt 0 ]]; then
  echo "Database suites FAILED on the real chain:"
  printf '  %s\n' "${failed[@]}"
  exit 1
fi
echo "All ${#SELECTED[@]} database suites passed on the real migration chain."
