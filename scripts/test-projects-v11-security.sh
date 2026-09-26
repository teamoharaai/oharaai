#!/usr/bin/env bash
# Projects V1.1 collaboration (Migration 073) database suite, including the concurrent acceptance race.
# It now runs on the full migration chain (TD-001) instead of a Docker-based local Supabase:
# scripts/db-chain/suites/projects-v11.sh. See scripts/db-chain/README.md.
exec bash "$(dirname "${BASH_SOURCE[0]}")/db-chain/run.sh" suites/projects-v11 "$@"
