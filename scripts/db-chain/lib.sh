# Helpers for shell suites in scripts/db-chain/suites/. Sourced, never run directly.
#
# run.sh gives each suite a fresh copy of the chain through CHAIN_AT (the suite's "<through>" in SUITES)
# plus GOAL_TEST_SOCKET/PORT/DB/PSQL, CHAIN_MIGRATIONS_DIR and CHAIN_TMP. A suite can load a
# production-shaped fixture at that point, then continue the real chain with continue_chain, exactly
# where the old per-domain bootstraps loaded theirs. Everything runs as the non-superuser postgres.

set -euo pipefail
[[ "${GOAL_TEST_SOCKET:-}" == /tmp/ohara-goal-* && -n "${CHAIN_AT:-}" ]] || {
  echo "Run this suite through scripts/db-chain/run.sh." >&2; exit 1; }

REPOSITORY_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PSQL=("$GOAL_TEST_PSQL" -X -v ON_ERROR_STOP=1 -h "$GOAL_TEST_SOCKET" -p "$GOAL_TEST_PORT" -U postgres -d "$GOAL_TEST_DB")

# Run one SQL file quietly; show the error output only on failure.
quiet_sql() { # <file> [label]
  local log="$CHAIN_TMP/suite-apply.log"
  if ! "${PSQL[@]}" -q -f "$1" >"$log" 2>&1; then
    echo "FAILED: ${2:-$(basename "$1")}" >&2
    grep -vE "^(NOTICE|psql:.*NOTICE)" "$log" | head -20 >&2
    exit 1
  fi
}

migration_file() { # <NNN>
  local file
  for file in "$CHAIN_MIGRATIONS_DIR/$1"_*.sql; do [[ -f "$file" ]] && { echo "$file"; return; }; done
  echo "No migration $1 in $CHAIN_MIGRATIONS_DIR" >&2; exit 1
}

# Apply the real migrations after CHAIN_AT, up to and including <NNN> (default: the end of the chain).
continue_chain() { # [NNN]
  local stop="${1:-999}" file name number
  for file in "$CHAIN_MIGRATIONS_DIR"/[0-9][0-9][0-9]_*.sql; do
    name="$(basename "$file")"; number="${name%%_*}"
    [[ "$number" > "$CHAIN_AT" && ! "$number" > "$stop" ]] || continue
    quiet_sql "$file" "applying $name"
    "${PSQL[@]}" -q -c "insert into supabase_migrations.schema_migrations(version, name) values ('$number', '$(basename "$name" .sql | cut -d_ -f2-)')"
    CHAIN_AT="$number"
  done
  echo "Chain continued through $CHAIN_AT."
}

# Re-run one already-applied migration, e.g. to prove it is idempotent.
apply_migration() { # <NNN>
  local file; file="$(migration_file "$1")"
  quiet_sql "$file" "re-applying $(basename "$file")"
}
