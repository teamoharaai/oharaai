-- ============================================================================
-- 029_check_username_available.sql
--
-- Anonymous-safe username availability check for the signup form.
--
-- 028's search_profiles_by_username is authenticated-only and, by design, a
-- prefix directory search that returns profile data. The signup availability
-- check runs BEFORE the user exists (anon role) and must expose nothing but a
-- single boolean. Rather than loosen 028's grant or widen its return, this
-- migration adds one narrow, purpose-built function.
--
-- Additive only: does not touch search_profiles_by_username, its grants, or any
-- 028 table/policy.
-- ============================================================================

-- Answers "is this exact username free" without exposing any profile data — no
-- name, no avatar, no list, just a boolean. SECURITY DEFINER so it can read
-- profiles regardless of the (anonymous) caller; search_path pinned to public,
-- extensions so the citext type/operators resolve.
--
-- A malformed username is never "available": the same format guard the column
-- CHECK enforces (^[a-z0-9_]{3,20}$) is applied here, and a non-matching input
-- returns false rather than raising — the caller treats it as unavailable.
-- Exact match only, case-insensitive via citext (this is a check, not a search).
create or replace function public.check_username_available(check_username text)
  returns boolean
  language plpgsql
  stable
  security definer
  set search_path = public, extensions
as $$
declare
  v_username text := btrim(lower(coalesce(check_username, '')));
begin
  -- invalid format -> not available (never raise; an invalid string can't be free)
  if v_username !~ '^[a-z0-9_]{3,20}$' then
    return false;
  end if;

  return not exists (
    select 1 from public.profiles where username = v_username::citext
  );
end;
$$;

-- Anon-callable by design (pre-signup), and reused later in authenticated
-- contexts (e.g. profile edit). Grant to both roles.
revoke all on function public.check_username_available(text) from public;
grant execute on function public.check_username_available(text) to anon;
grant execute on function public.check_username_available(text) to authenticated;
