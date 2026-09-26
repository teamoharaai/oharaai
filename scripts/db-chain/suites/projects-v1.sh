#!/usr/bin/env bash
# Projects V1 (Migration 071) on the full real chain, then the unchanged Projects V1 security assertions.
# Previously needed a Docker-based local Supabase on 127.0.0.1:54322.
# Run with `npm run test:projects:db` or `bash scripts/db-chain/run.sh projects-v1.sh`.
source "$(dirname "${BASH_SOURCE[0]}")/../lib.sh"

"${PSQL[@]}" -f "$REPOSITORY_ROOT/scripts/projects-v1-security.test.sql"
