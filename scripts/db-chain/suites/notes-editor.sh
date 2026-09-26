#!/usr/bin/env bash
# Notes editor v2 and Entries (Migrations 042, 044 and 045) on the full real chain, then the unchanged
# Notes security and Entries BRT idempotency assertions. The retired bootstrap was schema only.
# Run with `npm run test:entries:db` or `bash scripts/db-chain/run.sh notes-editor`.
source "$(dirname "${BASH_SOURCE[0]}")/../lib.sh"

"${PSQL[@]}" -f "$REPOSITORY_ROOT/scripts/notes-editor-security.test.sql"
"${PSQL[@]}" -f "$REPOSITORY_ROOT/scripts/entries-brt-idempotency.test.sql"
