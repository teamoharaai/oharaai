#!/usr/bin/env bash
# Sticky Note folders (Migrations 065 and 066) on the full real chain, then the unchanged folder ownership
# and cross-vault assertions. The retired bootstrap was schema only, so no fixture is needed.
# Run with `npm run test:sticky-folders:db` or `bash scripts/db-chain/run.sh sticky-note-folders`.
source "$(dirname "${BASH_SOURCE[0]}")/../lib.sh"

"${PSQL[@]}" -f "$REPOSITORY_ROOT/scripts/sticky-note-folders-security.test.sql"
