#!/usr/bin/env bash
# Projects V1 (Migration 071) database suite. It now runs on the full migration chain (TD-001) instead of
# a Docker-based local Supabase: scripts/db-chain/suites/projects-v1.sh. See scripts/db-chain/README.md.
exec bash "$(dirname "${BASH_SOURCE[0]}")/db-chain/run.sh" suites/projects-v1.sh "$@"
