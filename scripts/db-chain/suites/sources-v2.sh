#!/usr/bin/env bash
source "$(dirname "${BASH_SOURCE[0]}")/../lib.sh"

quiet_sql "$REPOSITORY_ROOT/scripts/db-chain/fixtures/sources-v2.sql" "loading the pre-091 Sources V2 fixture"
continue_chain
"${PSQL[@]}" -f "$REPOSITORY_ROOT/scripts/sources-v2-security.test.sql"
