#!/usr/bin/env bash
source "$(dirname "${BASH_SOURCE[0]}")/../lib.sh"
"${PSQL[@]}" -f "$REPOSITORY_ROOT/scripts/vault-context-security.test.sql"
