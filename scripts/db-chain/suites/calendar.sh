#!/usr/bin/env bash
# Calendar provider-link privacy and idempotency (Migration 089) on the full chain.
source "$(dirname "${BASH_SOURCE[0]}")/../lib.sh"

"${PSQL[@]}" -f "$REPOSITORY_ROOT/scripts/calendar-external-links-security.test.sql"
