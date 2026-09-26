#!/usr/bin/env bash
# Constellation (Migrations 032-035) database suite. It now runs on the full migration chain (TD-001):
# scripts/db-chain/suites/constellation.sh. See scripts/db-chain/README.md.
exec bash "$(dirname "${BASH_SOURCE[0]}")/db-chain/run.sh" suites/constellation "$@"
