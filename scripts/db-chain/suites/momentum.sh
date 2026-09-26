#!/usr/bin/env bash
# Momentum (Migrations 038, 040, 041 and 043) on the full real chain, then the unchanged snapshot
# publishing, revision and owner-isolation assertions. The retired bootstrap was schema only.
# Run with `npm run test:momentum:db` or `bash scripts/db-chain/run.sh momentum`.
source "$(dirname "${BASH_SOURCE[0]}")/../lib.sh"

"${PSQL[@]}" -f "$REPOSITORY_ROOT/scripts/momentum-security.test.sql"
