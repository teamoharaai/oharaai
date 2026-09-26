#!/usr/bin/env bash
# Circles (Migrations 053 and 054) on the full real chain, then the unchanged Circles security assertions.
# The retired bootstrap was schema only. Run with `npm run test:circles:db` or
# `bash scripts/db-chain/run.sh circles`.
source "$(dirname "${BASH_SOURCE[0]}")/../lib.sh"

"${PSQL[@]}" -f "$REPOSITORY_ROOT/scripts/circles-security.test.sql"

echo "Re-applying 053 must fail loudly (not idempotent by design; catches double-apply)..."
if "${PSQL[@]}" -q -f "$(migration_file 053)" >/dev/null 2>&1; then
  echo "Migration 053 re-applied silently; expected a duplicate-object error." >&2
  exit 1
fi
echo "Circles security suite passed."
