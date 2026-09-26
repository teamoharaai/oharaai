#!/usr/bin/env bash
# Sticky Note folders (Migrations 065 and 066) database suite. It now runs on the full migration chain
# (TD-001): scripts/db-chain/suites/sticky-note-folders.sh. See scripts/db-chain/README.md.
exec bash "$(dirname "${BASH_SOURCE[0]}")/db-chain/run.sh" suites/sticky-note-folders "$@"
