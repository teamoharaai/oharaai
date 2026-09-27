#!/usr/bin/env bash
# Rehearses the rollback-only hosted preflight (scripts/test-manual-goal-hosted.mjs) locally: builds the
# real chain only as far as hosted has applied, then runs the preflight against it with --local, so the
# pending migrations and every probe are exercised without touching hosted.
#
#   HOSTED_APPLIED_THROUGH  override the last migration hosted has applied (default: scripts/db-chain/hosted-applied-through,
#                           which a deploy updates)
#   OHARA_NODE / OHARA_PG_BIN / OHARA_DEFAULT_ACL / OHARA_MIGRATIONS_DIR as for run.sh
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
THROUGH="${HOSTED_APPLIED_THROUGH:-$(tr -d "[:space:]" < "$ROOT_DIR/scripts/db-chain/hosted-applied-through")}"
if ! ls "$ROOT_DIR/supabase/migrations"/[0-9][0-9][0-9]_*.sql | sed -E "s|.*/([0-9]{3})_.*|\1|" | awk -v t="$THROUGH" "\$1 > t { found = 1 } END { exit !found }"; then
  echo "Nothing pending after $THROUGH (hosted is current); skipped."; exit 0
fi
NODE="${OHARA_NODE:-$(command -v node || true)}"
[[ -n "$NODE" ]] || { echo "node is required (set OHARA_NODE)." >&2; exit 1; }

output="$(bash "$ROOT_DIR/scripts/db-chain/run.sh" --chain-only --keep --through "$THROUGH")"
echo "$output" | grep -E "^(Applying|Chain applied)"
env_line="$(echo "$output" | sed -n 's/^Env:  export //p')"
stop_line="$(echo "$output" | sed -n 's/^Stop: //p')"
[[ -n "$env_line" && -n "$stop_line" ]] || { echo "Could not read the kept cluster from run.sh" >&2; exit 1; }
trap 'eval "$stop_line"' EXIT
export $env_line

"$NODE" "$ROOT_DIR/scripts/test-manual-goal-hosted.mjs" --local --applied-through "$THROUGH"
