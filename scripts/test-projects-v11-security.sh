#!/usr/bin/env bash
set -euo pipefail
PROJECTS_V11_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
if command -v pg_config >/dev/null 2>&1; then
  PROJECTS_V11_PG_BIN="$(pg_config --bindir)"
else
  PROJECTS_V11_PG_BIN="/opt/homebrew/opt/postgresql@16/bin"
fi
"$PROJECTS_V11_PG_BIN/psql" -X -v ON_ERROR_STOP=1 \
  postgresql://postgres:postgres@127.0.0.1:54322/postgres \
  -f "$PROJECTS_V11_ROOT/scripts/projects-v11-security.test.sql"

PROJECTS_V11_DB="postgresql://postgres:postgres@127.0.0.1:54322/postgres"
PROJECTS_V11_OWNER="21000000-0000-0000-0000-000000000001"
PROJECTS_V11_MEMBER="22000000-0000-0000-0000-000000000002"
PROJECTS_V11_CANDIDATE_A="23000000-0000-0000-0000-000000000003"
PROJECTS_V11_CANDIDATE_B="24000000-0000-0000-0000-000000000004"
PROJECTS_V11_PROJECT="a2100000-0000-0000-0000-000000000001"
PROJECTS_V11_INVITE_A="d2300000-0000-0000-0000-000000000003"
PROJECTS_V11_INVITE_B="d2400000-0000-0000-0000-000000000004"
PROJECTS_V11_TMP="$(mktemp -d "/tmp/ohara-projects-v11.XXXXXX")"

cleanup_concurrency_fixture() {
  "$PROJECTS_V11_PG_BIN/psql" -X -v ON_ERROR_STOP=1 "$PROJECTS_V11_DB" -c \
    "delete from auth.users where id in ('$PROJECTS_V11_OWNER','$PROJECTS_V11_MEMBER','$PROJECTS_V11_CANDIDATE_A','$PROJECTS_V11_CANDIDATE_B');" >/dev/null 2>&1 || true
  case "$PROJECTS_V11_TMP" in
    /tmp/ohara-projects-v11.*) rm -rf -- "$PROJECTS_V11_TMP" ;;
    *) echo "Refusing to clean unexpected path: $PROJECTS_V11_TMP" >&2 ;;
  esac
}
trap cleanup_concurrency_fixture EXIT

"$PROJECTS_V11_PG_BIN/psql" -X -v ON_ERROR_STOP=1 "$PROJECTS_V11_DB" -c "
  insert into auth.users(id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,created_at,updated_at) values
    ('$PROJECTS_V11_OWNER','00000000-0000-0000-0000-000000000000','authenticated','authenticated','race-owner@example.com','',now(),now(),now()),
    ('$PROJECTS_V11_MEMBER','00000000-0000-0000-0000-000000000000','authenticated','authenticated','race-member@example.com','',now(),now(),now()),
    ('$PROJECTS_V11_CANDIDATE_A','00000000-0000-0000-0000-000000000000','authenticated','authenticated','race-a@example.com','',now(),now(),now()),
    ('$PROJECTS_V11_CANDIDATE_B','00000000-0000-0000-0000-000000000000','authenticated','authenticated','race-b@example.com','',now(),now(),now());
  update public.profiles set username='race'||substr(id::text,1,4) where id in ('$PROJECTS_V11_OWNER','$PROJECTS_V11_MEMBER','$PROJECTS_V11_CANDIDATE_A','$PROJECTS_V11_CANDIDATE_B');
  insert into public.projects(id,user_id,title,mode) values('$PROJECTS_V11_PROJECT','$PROJECTS_V11_OWNER','Race Project','team');
  insert into public.project_members(project_id,user_id,role) values('$PROJECTS_V11_PROJECT','$PROJECTS_V11_MEMBER','member');
  insert into public.project_invitations(id,project_id,inviter_id,invited_user_id,role) values
    ('$PROJECTS_V11_INVITE_A','$PROJECTS_V11_PROJECT','$PROJECTS_V11_OWNER','$PROJECTS_V11_CANDIDATE_A','member'),
    ('$PROJECTS_V11_INVITE_B','$PROJECTS_V11_PROJECT','$PROJECTS_V11_OWNER','$PROJECTS_V11_CANDIDATE_B','member');
" >/dev/null

set +e
"$PROJECTS_V11_PG_BIN/psql" -X -v ON_ERROR_STOP=1 "$PROJECTS_V11_DB" -c "begin; set local role authenticated; select set_config('request.jwt.claim.sub','$PROJECTS_V11_CANDIDATE_A',true); select public.respond_project_invitation_v11('$PROJECTS_V11_INVITE_A','accepted'); commit;" >"$PROJECTS_V11_TMP/a.log" 2>&1 &
PROJECTS_V11_PID_A=$!
"$PROJECTS_V11_PG_BIN/psql" -X -v ON_ERROR_STOP=1 "$PROJECTS_V11_DB" -c "begin; set local role authenticated; select set_config('request.jwt.claim.sub','$PROJECTS_V11_CANDIDATE_B',true); select public.respond_project_invitation_v11('$PROJECTS_V11_INVITE_B','accepted'); commit;" >"$PROJECTS_V11_TMP/b.log" 2>&1 &
PROJECTS_V11_PID_B=$!
wait "$PROJECTS_V11_PID_A"; PROJECTS_V11_STATUS_A=$?
wait "$PROJECTS_V11_PID_B"; PROJECTS_V11_STATUS_B=$?
set -e

if [[ $(( (PROJECTS_V11_STATUS_A == 0) + (PROJECTS_V11_STATUS_B == 0) )) -ne 1 ]]; then
  echo "Concurrent acceptance did not produce exactly one winner." >&2
  cat "$PROJECTS_V11_TMP/a.log" "$PROJECTS_V11_TMP/b.log" >&2
  exit 1
fi

PROJECTS_V11_COUNTS="$($PROJECTS_V11_PG_BIN/psql -X -At "$PROJECTS_V11_DB" -c "select count(*)||':'||(select count(*) from public.project_invitations where project_id='$PROJECTS_V11_PROJECT' and status='accepted') from public.project_members where project_id='$PROJECTS_V11_PROJECT';")"
if [[ "$PROJECTS_V11_COUNTS" != "3:1" ]]; then
  echo "Concurrent acceptance cap failed: $PROJECTS_V11_COUNTS" >&2
  exit 1
fi
echo "Projects V1.1 concurrent invitation acceptance cap passed."
