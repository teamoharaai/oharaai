#!/usr/bin/env bash
# Applies Migration 042 and its adversarial assertions to a disposable local
# PostgreSQL cluster bound only to a private Unix socket. It never reads .env.

set -euo pipefail

REPOSITORY_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BOOTSTRAP_PATH="$REPOSITORY_ROOT/scripts/notes-editor-security-bootstrap.sql"
MIGRATION_PATH="$REPOSITORY_ROOT/supabase/migrations/042_notes_editor_v2.sql"
TEST_PATH="$REPOSITORY_ROOT/scripts/notes-editor-security.test.sql"

if command -v pg_config >/dev/null 2>&1; then
  NOTES_PG_BIN="$(pg_config --bindir)"
elif [[ -d /opt/homebrew/opt/postgresql@16/bin ]]; then
  NOTES_PG_BIN="/opt/homebrew/opt/postgresql@16/bin"
else
  echo "PostgreSQL 16+ is required for the isolated Notes database harness." >&2
  exit 1
fi

for executable in initdb pg_ctl psql; do
  if [[ ! -x "$NOTES_PG_BIN/$executable" ]]; then
    echo "Missing PostgreSQL executable: $NOTES_PG_BIN/$executable" >&2
    exit 1
  fi
done

NOTES_TEST_ROOT="$(mktemp -d "/tmp/ohara-notes.XXXXXX")"
NOTES_DATA_DIR="$NOTES_TEST_ROOT/data"
NOTES_SOCKET_DIR="$NOTES_TEST_ROOT/socket"
mkdir -p "$NOTES_SOCKET_DIR"

cleanup() {
  if [[ -d "$NOTES_DATA_DIR" ]] \
    && "$NOTES_PG_BIN/pg_ctl" -D "$NOTES_DATA_DIR" status >/dev/null 2>&1; then
    "$NOTES_PG_BIN/pg_ctl" -D "$NOTES_DATA_DIR" -m fast -w stop >/dev/null
  fi
  case "$NOTES_TEST_ROOT" in
    /tmp/ohara-notes.*) rm -rf -- "$NOTES_TEST_ROOT" ;;
    *) echo "Refusing to clean unexpected path: $NOTES_TEST_ROOT" >&2 ;;
  esac
}
trap cleanup EXIT

"$NOTES_PG_BIN/initdb" -D "$NOTES_DATA_DIR" -A trust -U postgres \
  --encoding=UTF8 --no-locale >/dev/null
"$NOTES_PG_BIN/pg_ctl" -D "$NOTES_DATA_DIR" \
  -l "$NOTES_TEST_ROOT/postgres.log" \
  -o "-k $NOTES_SOCKET_DIR -c listen_addresses='' -c unix_socket_permissions=0700" \
  -w start >/dev/null

PSQL=("$NOTES_PG_BIN/psql" -X -v ON_ERROR_STOP=1 -h "$NOTES_SOCKET_DIR" -U postgres -d postgres)

echo "Verified disposable local PostgreSQL target: unix socket $NOTES_SOCKET_DIR"
"${PSQL[@]}" -f "$BOOTSTRAP_PATH" >/dev/null
"${PSQL[@]}" -f "$MIGRATION_PATH" >/dev/null
"${PSQL[@]}" -f "$TEST_PATH"
