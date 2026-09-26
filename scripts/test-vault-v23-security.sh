#!/usr/bin/env bash
# Vault V2.3 (Migration 070) database suite. It now runs on the full migration chain (TD-001):
# scripts/db-chain/suites/vault-v23.sh. See scripts/db-chain/README.md.
exec bash "$(dirname "${BASH_SOURCE[0]}")/db-chain/run.sh" suites/vault-v23 "$@"
