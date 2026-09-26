#!/usr/bin/env bash
# Circles (Migrations 053 and 054) database suite. It now runs on the full migration chain (TD-001):
# scripts/db-chain/suites/circles.sh. See scripts/db-chain/README.md.
exec bash "$(dirname "${BASH_SOURCE[0]}")/db-chain/run.sh" suites/circles "$@"
