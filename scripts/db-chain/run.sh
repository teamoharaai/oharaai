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
#
# Environment:
#   OHARA_PG_BIN       PostgreSQL bin dir with pgvector (default: Homebrew 17)
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
  "lib/goals/task-schedule-continuity-db.test.mjs:074"
)

CHAIN_ONLY=false
KEEP=false
FILTER=""
for arg in "$@"; do
  case "$arg" in
    --chain-only) CHAIN_ONLY=true ;;
    --keep) KEEP=true ;;
    -*) echo "Unknown option: $arg" >&2; exit 2 ;;
    *) FILTER="$arg" ;;
  esac
done

# PostgreSQL with pgvector ------------------------------------------------------
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
if ! $CHAIN_ONLY && [[ -z "$NODE" ]]; then
  echo "node is required to run the suites (set OHARA_NODE)." >&2
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
    echo "Stop: $PG_BIN/pg_ctl -D $DATA_DIR stop && rm -rf $TEST_ROOT"
    return
  fi
  if [[ -d "$DATA_DIR" ]] && "$PG_BIN/pg_ctl" -D "$DATA_DIR" status >/dev/null 2>&1; then
    "$PG_BIN/pg_ctl" -D "$DATA_DIR" -m fast -w stop >/dev/null
  fi
  case "$TEST_ROOT" in
    /tmp/ohara-goal-chain.*) rm -rf -- "$TEST_ROOT" ;;
    *) echo "Refusing to clean unexpected test path: $TEST_ROOT" >&2 ;;
  esac
}
trap cleanup EXIT

"$PG_BIN/initdb" -D "$DATA_DIR" -A trust -U supabase_admin --encoding=UTF8 --locale=en_US.UTF-8 >/dev/null
"$PG_BIN/pg_ctl" -D "$DATA_DIR" -l "$TEST_ROOT/postgres.log" \
  -o "-k $SOCKET_DIR -p $PORT -c listen_addresses='' -c unix_socket_permissions=0700" -w start >/dev/null

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
declare -a SELECTED=()
SNAPSHOTS=" "
for entry in "${SUITES[@]}"; do
  file="${entry%%:*}"; through="${entry##*:}"
  [[ -z "$FILTER" || "$file" == *"$FILTER"* ]] || continue
  SELECTED+=("$entry")
  [[ "$through" == all ]] || SNAPSHOTS+="$through "
done
if ! $CHAIN_ONLY && [[ ${#SELECTED[@]} -eq 0 ]]; then
  echo "No suite matches '$FILTER'." >&2
  exit 2
fi

# Migrations --------------------------------------------------------------------
shopt -s nullglob
MIGRATIONS=("$MIGRATIONS_DIR"/[0-9][0-9][0-9]_*.sql)
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
  if [[ "$SNAPSHOTS" == *" $number "* ]]; then
    psql_as supabase_admin postgres -c "create database chain_$number template chain owner postgres"
  fi
done
echo "Chain applied: ${MIGRATIONS[0]##*/} .. ${MIGRATIONS[${#MIGRATIONS[@]}-1]##*/}"
$CHAIN_ONLY && exit 0

# Suites ------------------------------------------------------------------------
cd "$ROOT_DIR"
failed=()
index=0
for entry in "${SELECTED[@]}"; do
  file="${entry%%:*}"; through="${entry##*:}"
  index=$((index + 1))
  template=chain; [[ "$through" == all ]] || template="chain_$through"
  database="suite_$index"
  psql_as supabase_admin postgres -c "create database $database template $template owner postgres"
  echo
  echo "== $file (on $template)"
  if GOAL_TEST_SOCKET="$SOCKET_DIR" GOAL_TEST_PORT="$PORT" GOAL_TEST_DB="$database" \
     GOAL_TEST_PSQL="$PG_BIN/psql" PGUSER=postgres \
     "$NODE" --test "$file"; then
    :
  else
    failed+=("$file")
  fi
done

echo
if [[ ${#failed[@]} -gt 0 ]]; then
  echo "Database suites FAILED on the real chain:"
  printf '  %s\n' "${failed[@]}"
  exit 1
fi
echo "All ${#SELECTED[@]} database suites passed on the real migration chain."
