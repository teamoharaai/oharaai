#!/usr/bin/env bash
set -euo pipefail
REPOSITORY_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PG_BIN="$(pg_config --bindir)"
"$PG_BIN/psql" -X -v ON_ERROR_STOP=1 \
  postgresql://postgres:postgres@127.0.0.1:54322/postgres \
  -f "$REPOSITORY_ROOT/scripts/projects-v1-security.test.sql"
