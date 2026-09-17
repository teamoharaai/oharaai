#!/usr/bin/env bash
# Applies Migration 053 (Circles social layer) to an isolated local PostgreSQL
# cluster and runs the Circles security assertions. Never reads Supabase
# credentials or contacts a linked/live project. Mirrors
# scripts/test-tasks-security.sh. Run via: npm run test:circles:db

set -euo pipefail

# macOS postmaster aborts ("became multithreaded during startup") without a locale.
export LC_ALL="${LC_ALL:-C}"

CIRCLES_REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BOOTSTRAP_PATH="$CIRCLES_REPO_ROOT/scripts/circles-security-bootstrap.sql"
TEST_PATH="$CIRCLES_REPO_ROOT/scripts/circles-security.test.sql"
MIGRATION_053="$CIRCLES_REPO_ROOT/supabase/migrations/053_circles_social_layer.sql"

if command -v pg_config >/dev/null 2>&1; then
  PG_BIN="$(pg_config --bindir)"
elif [[ -d /opt/homebrew/opt/postgresql@16/bin ]]; then
  PG_BIN="/opt/homebrew/opt/postgresql@16/bin"
else
  echo "PostgreSQL 16+ is required." >&2
  exit 1
fi

for executable in initdb pg_ctl psql; do
  [[ -x "$PG_BIN/$executable" ]] || { echo "Missing $PG_BIN/$executable" >&2; exit 1; }
done

TEST_ROOT="$(mktemp -d "/tmp/ohara-circles.XXXXXX")"
DATA_DIR="$TEST_ROOT/data"
SOCKET_DIR="$TEST_ROOT/socket"
mkdir -p "$SOCKET_DIR"

cleanup() {
  if [[ -d "$DATA_DIR" ]] && "$PG_BIN/pg_ctl" -D "$DATA_DIR" status >/dev/null 2>&1; then
    "$PG_BIN/pg_ctl" -D "$DATA_DIR" -m fast -w stop >/dev/null
  fi
  case "$TEST_ROOT" in
    /tmp/ohara-circles.*) rm -rf -- "$TEST_ROOT" ;;
    *) echo "Refusing to clean unexpected test path: $TEST_ROOT" >&2 ;;
  esac
}
trap cleanup EXIT

"$PG_BIN/initdb" -D "$DATA_DIR" -A trust -U postgres --encoding=UTF8 --no-locale >/dev/null
"$PG_BIN/pg_ctl" -D "$DATA_DIR" -l "$TEST_ROOT/postgres.log" \
  -o "-k $SOCKET_DIR -c listen_addresses='' -c unix_socket_permissions=0700" -w start >/dev/null

PSQL=("$PG_BIN/psql" -X -v ON_ERROR_STOP=1 -h "$SOCKET_DIR" -U postgres -d postgres)

echo "Applying isolated bootstrap..."
"${PSQL[@]}" -f "$BOOTSTRAP_PATH" >/dev/null
echo "Applying Migration 053..."
"${PSQL[@]}" -f "$MIGRATION_053" >/dev/null
echo "Running Circles security assertions..."
"${PSQL[@]}" -f "$TEST_PATH"
echo "Re-applying 053 must fail loudly (not idempotent by design; catches double-apply)..."
if "${PSQL[@]}" -f "$MIGRATION_053" >/dev/null 2>&1; then
  echo "Migration 053 re-applied silently — expected a duplicate-object error." >&2
  exit 1
fi
echo "Circles security suite passed."
