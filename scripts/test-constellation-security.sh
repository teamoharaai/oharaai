#!/usr/bin/env bash
#
# Runs the Constellation migration and security assertions against a disposable
# local PostgreSQL cluster. It never reads Supabase credentials or contacts the
# linked/live project.
#
# Usage:
#   bash scripts/test-constellation-security.sh

set -euo pipefail

REPOSITORY_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PERSISTENCE_MIGRATION_PATH="$REPOSITORY_ROOT/supabase/migrations/032_constellation_persistence.sql"
LAYOUT_MIGRATION_PATH="$REPOSITORY_ROOT/supabase/migrations/034_constellation_layout_positions.sql"
GOAL_LINKS_MIGRATION_PATH="$REPOSITORY_ROOT/supabase/migrations/035_constellation_goal_links.sql"
BOOTSTRAP_PATH="$REPOSITORY_ROOT/scripts/constellation-security-bootstrap.sql"
TEST_PATH="$REPOSITORY_ROOT/scripts/constellation-security.test.sql"

if command -v pg_config >/dev/null 2>&1; then
  CONSTELLATION_PG_BIN="$(pg_config --bindir)"
elif [[ -d /opt/homebrew/opt/postgresql@16/bin ]]; then
  CONSTELLATION_PG_BIN="/opt/homebrew/opt/postgresql@16/bin"
else
  echo "PostgreSQL 16+ is required (pg_config, initdb, pg_ctl, and psql)." >&2
  exit 1
fi

for executable in initdb pg_ctl psql; do
  if [[ ! -x "$CONSTELLATION_PG_BIN/$executable" ]]; then
    echo "Missing PostgreSQL executable: $CONSTELLATION_PG_BIN/$executable" >&2
    exit 1
  fi
done

for required_file in \
  "$PERSISTENCE_MIGRATION_PATH" \
  "$LAYOUT_MIGRATION_PATH" \
  "$GOAL_LINKS_MIGRATION_PATH" \
  "$BOOTSTRAP_PATH" \
  "$TEST_PATH"; do
  if [[ ! -f "$required_file" ]]; then
    echo "Missing security-harness file: $required_file" >&2
    exit 1
  fi
done

CONSTELLATION_TEST_ROOT="$(mktemp -d "/tmp/ohara-cs.XXXXXX")"
CONSTELLATION_DATA_DIR="$CONSTELLATION_TEST_ROOT/data"
CONSTELLATION_SOCKET_DIR="$CONSTELLATION_TEST_ROOT/socket"
mkdir -p "$CONSTELLATION_SOCKET_DIR"

cleanup() {
  if [[ -d "$CONSTELLATION_DATA_DIR" ]] \
    && "$CONSTELLATION_PG_BIN/pg_ctl" -D "$CONSTELLATION_DATA_DIR" status >/dev/null 2>&1; then
    "$CONSTELLATION_PG_BIN/pg_ctl" -D "$CONSTELLATION_DATA_DIR" -m fast -w stop >/dev/null
  fi

  case "$CONSTELLATION_TEST_ROOT" in
    /tmp/ohara-cs.*)
      rm -rf -- "$CONSTELLATION_TEST_ROOT"
      ;;
    *)
      echo "Refusing to clean unexpected test path: $CONSTELLATION_TEST_ROOT" >&2
      ;;
  esac
}
trap cleanup EXIT

"$CONSTELLATION_PG_BIN/initdb" \
  -D "$CONSTELLATION_DATA_DIR" \
  -A trust \
  -U postgres \
  --encoding=UTF8 \
  --no-locale >/dev/null

if ! "$CONSTELLATION_PG_BIN/pg_ctl" \
  -D "$CONSTELLATION_DATA_DIR" \
  -l "$CONSTELLATION_TEST_ROOT/postgres.log" \
  -o "-k $CONSTELLATION_SOCKET_DIR -c listen_addresses='' -c unix_socket_permissions=0700" \
  -w start >/dev/null; then
  echo "Disposable PostgreSQL failed to start:" >&2
  sed -n '1,200p' "$CONSTELLATION_TEST_ROOT/postgres.log" >&2
  exit 1
fi

PSQL=(
  "$CONSTELLATION_PG_BIN/psql"
  -X
  -v ON_ERROR_STOP=1
  -h "$CONSTELLATION_SOCKET_DIR"
  -U postgres
  -d postgres
)

echo "Applying isolated source-schema bootstrap..."
"${PSQL[@]}" -f "$BOOTSTRAP_PATH" >/dev/null

echo "Applying migration 032 to the disposable database..."
"${PSQL[@]}" -f "$PERSISTENCE_MIGRATION_PATH" >/dev/null

echo "Applying migration 034 to the disposable database..."
"${PSQL[@]}" -f "$LAYOUT_MIGRATION_PATH" >/dev/null

echo "Applying migration 035 to the disposable database..."
"${PSQL[@]}" -f "$GOAL_LINKS_MIGRATION_PATH" >/dev/null

echo "Running Constellation constraint and RLS assertions..."
"${PSQL[@]}" -f "$TEST_PATH"

echo "Constellation database security harness passed."
