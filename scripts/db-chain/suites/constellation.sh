#!/usr/bin/env bash
# Constellation (Migrations 032, 034 and 035) on the full real chain, with the real grants, then the
# unchanged constraint and RLS assertions. The retired bootstrap was schema only.
# Run with `bash scripts/test-constellation-security.sh` or `bash scripts/db-chain/run.sh constellation`.
source "$(dirname "${BASH_SOURCE[0]}")/../lib.sh"

"${PSQL[@]}" -f "$REPOSITORY_ROOT/scripts/constellation-security.test.sql"
echo "Constellation database security harness passed."
