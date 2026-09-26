#!/usr/bin/env bash
# Projects V1.1 collaboration (Migration 073) on the full real chain: the unchanged security assertions,
# then the concurrent invitation-acceptance race against the three-person cap, exactly as
# scripts/test-projects-v11-security.sh ran them against Docker Supabase on 127.0.0.1:54322.
# Run with `bash scripts/test-projects-v11-security.sh` or `bash scripts/db-chain/run.sh projects-v11`.
source "$(dirname "${BASH_SOURCE[0]}")/../lib.sh"

"${PSQL[@]}" -f "$REPOSITORY_ROOT/scripts/projects-v11-security.test.sql"

OWNER="21000000-0000-0000-0000-000000000001"
MEMBER="22000000-0000-0000-0000-000000000002"
CANDIDATE_A="23000000-0000-0000-0000-000000000003"
CANDIDATE_B="24000000-0000-0000-0000-000000000004"
PROJECT="a2100000-0000-0000-0000-000000000001"
INVITE_A="d2300000-0000-0000-0000-000000000003"
INVITE_B="d2400000-0000-0000-0000-000000000004"

"${PSQL[@]}" -q -c "
  insert into auth.users(id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,created_at,updated_at) values
    ('$OWNER','00000000-0000-0000-0000-000000000000','authenticated','authenticated','race-owner@example.com','',now(),now(),now()),
    ('$MEMBER','00000000-0000-0000-0000-000000000000','authenticated','authenticated','race-member@example.com','',now(),now(),now()),
    ('$CANDIDATE_A','00000000-0000-0000-0000-000000000000','authenticated','authenticated','race-a@example.com','',now(),now(),now()),
    ('$CANDIDATE_B','00000000-0000-0000-0000-000000000000','authenticated','authenticated','race-b@example.com','',now(),now(),now());
  update public.profiles set username='race'||substr(id::text,1,4) where id in ('$OWNER','$MEMBER','$CANDIDATE_A','$CANDIDATE_B');
  insert into public.projects(id,user_id,title,mode) values('$PROJECT','$OWNER','Race Project','team');
  insert into public.project_members(project_id,user_id,role) values('$PROJECT','$MEMBER','member');
  insert into public.project_invitations(id,project_id,inviter_id,invited_user_id,role) values
    ('$INVITE_A','$PROJECT','$OWNER','$CANDIDATE_A','member'),
    ('$INVITE_B','$PROJECT','$OWNER','$CANDIDATE_B','member');
" >/dev/null

accept() { # <candidate> <invite>
  "${PSQL[@]}" -c "begin; set local role authenticated; select set_config('request.jwt.claim.sub','$1',true); select public.respond_project_invitation_v11('$2','accepted'); commit;"
}
set +e
accept "$CANDIDATE_A" "$INVITE_A" >"$CHAIN_TMP/race-a.log" 2>&1 & pid_a=$!
accept "$CANDIDATE_B" "$INVITE_B" >"$CHAIN_TMP/race-b.log" 2>&1 & pid_b=$!
wait "$pid_a"; status_a=$?
wait "$pid_b"; status_b=$?
set -e

if [[ $(( (status_a == 0) + (status_b == 0) )) -ne 1 ]]; then
  echo "Concurrent acceptance did not produce exactly one winner." >&2
  cat "$CHAIN_TMP/race-a.log" "$CHAIN_TMP/race-b.log" >&2
  exit 1
fi
counts="$("${PSQL[@]}" -At -c "select count(*)||':'||(select count(*) from public.project_invitations where project_id='$PROJECT' and status='accepted') from public.project_members where project_id='$PROJECT';")"
if [[ "$counts" != "3:1" ]]; then
  echo "Concurrent acceptance cap failed: $counts" >&2
  exit 1
fi
echo "Projects V1.1 concurrent invitation acceptance cap passed."
