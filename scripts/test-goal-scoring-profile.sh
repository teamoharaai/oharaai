#!/usr/bin/env bash
# Disposable Unix-socket database only. Does not read .env or contact production.
set -euo pipefail
SCORING_REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SCORING_BIN="/opt/homebrew/opt/postgresql@16/bin"
SCORING_TEMP="$(mktemp -d /tmp/ohara-scoring-profile.XXXXXX)"
mkdir -p "$SCORING_TEMP/socket"
cleanup() {
  "$SCORING_BIN/pg_ctl" -D "$SCORING_TEMP/data" -m fast -w stop >/dev/null 2>&1 || true
}
trap cleanup EXIT
"$SCORING_BIN/initdb" -D "$SCORING_TEMP/data" -A trust -U postgres --encoding=UTF8 --no-locale >/dev/null
"$SCORING_BIN/pg_ctl" -D "$SCORING_TEMP/data" -l "$SCORING_TEMP/postgres.log" \
  -o "-k $SCORING_TEMP/socket -c listen_addresses='' -c unix_socket_permissions=0700" -w start >/dev/null
"$SCORING_BIN/psql" -X -v ON_ERROR_STOP=1 -h "$SCORING_TEMP/socket" -U postgres -d postgres \
  -f "$SCORING_REPO/tests/goals/scoring-profile.test.sql"
echo "Scoring-profile isolation tests passed. Stopped disposable database retained at $SCORING_TEMP."
