#!/usr/bin/env bash
# Applies migrations 065 + 066 and their adversarial RLS assertions to a
# disposable local PostgreSQL cluster bound only to a private Unix socket. It
# never reads .env or contacts a linked/live Supabase project.

set -euo pipefail

REPOSITORY_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BOOTSTRAP_PATH="$REPOSITORY_ROOT/scripts/sticky-note-folders-security-bootstrap.sql"
MIGRATION_065="$REPOSITORY_ROOT/supabase/migrations/065_vault_note_folders.sql"
MIGRATION_066="$REPOSITORY_ROOT/supabase/migrations/066_harden_note_folder_vault_ownership.sql"
TEST_PATH="$REPOSITORY_ROOT/scripts/sticky-note-folders-security.test.sql"

if command -v pg_config >/dev/null 2>&1; then
  FOLDERS_PG_BIN="$(pg_config --bindir)"
elif [[ -d /opt/homebrew/opt/postgresql@16/bin ]]; then
  FOLDERS_PG_BIN="/opt/homebrew/opt/postgresql@16/bin"
elif [[ -d /opt/homebrew/opt/postgresql@17/bin ]]; then
  FOLDERS_PG_BIN="/opt/homebrew/opt/postgresql@17/bin"
else
  echo "PostgreSQL 16+ is required for the isolated Sticky Note folders harness." >&2
  exit 1
fi

for executable in initdb pg_ctl psql; do
  if [[ ! -x "$FOLDERS_PG_BIN/$executable" ]]; then
    echo "Missing PostgreSQL executable: $FOLDERS_PG_BIN/$executable" >&2
    exit 1
  fi
done

FOLDERS_TEST_ROOT="$(mktemp -d "/tmp/ohara-note-folders.XXXXXX")"
FOLDERS_DATA_DIR="$FOLDERS_TEST_ROOT/data"
FOLDERS_SOCKET_DIR="$FOLDERS_TEST_ROOT/socket"
mkdir -p "$FOLDERS_SOCKET_DIR"

cleanup() {
  if [[ -d "$FOLDERS_DATA_DIR" ]] \
    && "$FOLDERS_PG_BIN/pg_ctl" -D "$FOLDERS_DATA_DIR" status >/dev/null 2>&1; then
    "$FOLDERS_PG_BIN/pg_ctl" -D "$FOLDERS_DATA_DIR" -m fast -w stop >/dev/null
  fi
  case "$FOLDERS_TEST_ROOT" in
    /tmp/ohara-note-folders.*) rm -rf -- "$FOLDERS_TEST_ROOT" ;;
    *) echo "Refusing to clean unexpected path: $FOLDERS_TEST_ROOT" >&2 ;;
  esac
}
trap cleanup EXIT

"$FOLDERS_PG_BIN/initdb" -D "$FOLDERS_DATA_DIR" -A trust -U postgres \
  --encoding=UTF8 --no-locale >/dev/null
"$FOLDERS_PG_BIN/pg_ctl" -D "$FOLDERS_DATA_DIR" \
  -l "$FOLDERS_TEST_ROOT/postgres.log" \
  -o "-k $FOLDERS_SOCKET_DIR -c listen_addresses='' -c unix_socket_permissions=0700" \
  -w start >/dev/null

PSQL=("$FOLDERS_PG_BIN/psql" -X -v ON_ERROR_STOP=1 -h "$FOLDERS_SOCKET_DIR" -U postgres -d postgres)

echo "Verified disposable local PostgreSQL target: unix socket $FOLDERS_SOCKET_DIR"
"${PSQL[@]}" -f "$BOOTSTRAP_PATH" >/dev/null
"${PSQL[@]}" -f "$MIGRATION_065" >/dev/null
"${PSQL[@]}" -f "$MIGRATION_066" >/dev/null
"${PSQL[@]}" -f "$TEST_PATH"
