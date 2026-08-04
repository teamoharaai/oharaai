#!/usr/bin/env bash
# Runs migration 038 and adversarial assertions against a disposable local
# PostgreSQL cluster bound only to a private Unix socket. It never reads .env.

set -euo pipefail

REPOSITORY_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MIGRATION_PATH="$REPOSITORY_ROOT/supabase/migrations/038_momentum_foundation.sql"
BOOTSTRAP_PATH="$REPOSITORY_ROOT/scripts/momentum-security-bootstrap.sql"
TEST_PATH="$REPOSITORY_ROOT/scripts/momentum-security.test.sql"

if command -v pg_config >/dev/null 2>&1; then
  MOMENTUM_PG_BIN="$(pg_config --bindir)"
elif [[ -d /opt/homebrew/opt/postgresql@16/bin ]]; then
  MOMENTUM_PG_BIN="/opt/homebrew/opt/postgresql@16/bin"
else
  echo "PostgreSQL 16+ is required for the isolated Momentum database harness." >&2
  exit 1
fi

for executable in initdb pg_ctl psql; do
  if [[ ! -x "$MOMENTUM_PG_BIN/$executable" ]]; then
    echo "Missing PostgreSQL executable: $MOMENTUM_PG_BIN/$executable" >&2
    exit 1
  fi
done

MOMENTUM_TEST_ROOT="$(mktemp -d "/tmp/ohara-momentum.XXXXXX")"
MOMENTUM_DATA_DIR="$MOMENTUM_TEST_ROOT/data"
MOMENTUM_SOCKET_DIR="$MOMENTUM_TEST_ROOT/socket"
mkdir -p "$MOMENTUM_SOCKET_DIR"

cleanup() {
  if [[ -d "$MOMENTUM_DATA_DIR" ]] \
    && "$MOMENTUM_PG_BIN/pg_ctl" -D "$MOMENTUM_DATA_DIR" status >/dev/null 2>&1; then
    "$MOMENTUM_PG_BIN/pg_ctl" -D "$MOMENTUM_DATA_DIR" -m fast -w stop >/dev/null
  fi
  case "$MOMENTUM_TEST_ROOT" in
    /tmp/ohara-momentum.*) rm -rf -- "$MOMENTUM_TEST_ROOT" ;;
    *) echo "Refusing to clean unexpected path: $MOMENTUM_TEST_ROOT" >&2 ;;
  esac
}
trap cleanup EXIT

"$MOMENTUM_PG_BIN/initdb" -D "$MOMENTUM_DATA_DIR" -A trust -U postgres \
  --encoding=UTF8 --no-locale >/dev/null

if ! "$MOMENTUM_PG_BIN/pg_ctl" -D "$MOMENTUM_DATA_DIR" \
  -l "$MOMENTUM_TEST_ROOT/postgres.log" \
  -o "-k $MOMENTUM_SOCKET_DIR -c listen_addresses='' -c unix_socket_permissions=0700" \
  -w start >/dev/null; then
  sed -n '1,200p' "$MOMENTUM_TEST_ROOT/postgres.log" >&2
  exit 1
fi

PSQL=("$MOMENTUM_PG_BIN/psql" -X -v ON_ERROR_STOP=1 -h "$MOMENTUM_SOCKET_DIR" -U postgres -d postgres)

echo "Verified disposable local PostgreSQL target: unix socket $MOMENTUM_SOCKET_DIR"
"${PSQL[@]}" -f "$BOOTSTRAP_PATH" >/dev/null
"${PSQL[@]}" -f "$MIGRATION_PATH" >/dev/null
"${PSQL[@]}" -f "$TEST_PATH"
