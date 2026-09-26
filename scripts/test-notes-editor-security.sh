#!/usr/bin/env bash
# Notes editor v2 and Entries (Migrations 042, 044, 045 and 077) database suite. It now runs on the full
# migration chain (TD-001): scripts/db-chain/suites/notes-editor.sh. See scripts/db-chain/README.md.
exec bash "$(dirname "${BASH_SOURCE[0]}")/db-chain/run.sh" suites/notes-editor "$@"
