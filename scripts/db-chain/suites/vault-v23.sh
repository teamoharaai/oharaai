#!/usr/bin/env bash
# Vault V2.3 (Migration 070) on the real chain: production-shaped rows before 070, then the rest of the
# chain, then the unchanged classification and owner-isolation assertions.
# Run with `bash scripts/test-vault-v23-security.sh` or `bash scripts/db-chain/run.sh vault-v23` (SUITES entry: chain through 069).
source "$(dirname "${BASH_SOURCE[0]}")/../lib.sh"

quiet_sql "$REPOSITORY_ROOT/scripts/db-chain/fixtures/vault-v23.sql" "loading the pre-070 Vault fixture"
continue_chain
"${PSQL[@]}" -f "$REPOSITORY_ROOT/scripts/vault-v23-security.test.sql"
