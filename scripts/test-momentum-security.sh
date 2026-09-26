#!/usr/bin/env bash
# Momentum (Migrations 038, 040, 041 and 043) database suite. It now runs on the full migration chain
# (TD-001): scripts/db-chain/suites/momentum.sh. See scripts/db-chain/README.md.
exec bash "$(dirname "${BASH_SOURCE[0]}")/db-chain/run.sh" suites/momentum "$@"
