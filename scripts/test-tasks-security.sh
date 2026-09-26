#!/usr/bin/env bash
# Task foundation (Migrations 047-051) database suite. It now runs on the real migration chain (TD-001),
# with the legacy fixture loaded on the chain through 046: scripts/db-chain/suites/tasks.sh.
# See scripts/db-chain/README.md.
exec bash "$(dirname "${BASH_SOURCE[0]}")/db-chain/run.sh" suites/tasks "$@"
