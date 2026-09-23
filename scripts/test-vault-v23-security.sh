#!/usr/bin/env bash
# Rehearses migration 070 and adversarial classification/owner checks against a
# disposable local PostgreSQL cluster. It never reads .env or contacts Supabase.
set -euo pipefail

REPOSITORY_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
if command -v pg_config >/dev/null 2>&1; then
  VAULT_PG_BIN="$(pg_config --bindir)"
else
  VAULT_PG_BIN="/opt/homebrew/opt/postgresql@16/bin"
fi

VAULT_TEST_ROOT="$(mktemp -d "/tmp/ohara-vault-v23.XXXXXX")"
VAULT_DATA_DIR="$VAULT_TEST_ROOT/data"
VAULT_SOCKET_DIR="$VAULT_TEST_ROOT/socket"
mkdir -p "$VAULT_SOCKET_DIR"
cleanup() {
  if [[ -d "$VAULT_DATA_DIR" ]] && "$VAULT_PG_BIN/pg_ctl" -D "$VAULT_DATA_DIR" status >/dev/null 2>&1; then
    "$VAULT_PG_BIN/pg_ctl" -D "$VAULT_DATA_DIR" -m fast -w stop >/dev/null
  fi
  case "$VAULT_TEST_ROOT" in
    /tmp/ohara-vault-v23.*) rm -rf -- "$VAULT_TEST_ROOT" ;;
    *) echo "Refusing to clean unexpected path: $VAULT_TEST_ROOT" >&2 ;;
  esac
}
trap cleanup EXIT

"$VAULT_PG_BIN/initdb" -D "$VAULT_DATA_DIR" -A trust -U postgres --encoding=UTF8 --no-locale >/dev/null
"$VAULT_PG_BIN/pg_ctl" -D "$VAULT_DATA_DIR" -l "$VAULT_TEST_ROOT/postgres.log" -o "-k $VAULT_SOCKET_DIR -c listen_addresses='' -c unix_socket_permissions=0700" -w start >/dev/null
PSQL=("$VAULT_PG_BIN/psql" -X -v ON_ERROR_STOP=1 -h "$VAULT_SOCKET_DIR" -U postgres -d postgres)
echo "Verified disposable local PostgreSQL target: unix socket $VAULT_SOCKET_DIR"
"${PSQL[@]}" -f "$REPOSITORY_ROOT/scripts/vault-v23-security-bootstrap.sql" >/dev/null
"${PSQL[@]}" -f "$REPOSITORY_ROOT/supabase/migrations/070_vault_item_content_kind.sql" >/dev/null
"${PSQL[@]}" -f "$REPOSITORY_ROOT/scripts/vault-v23-security.test.sql"
