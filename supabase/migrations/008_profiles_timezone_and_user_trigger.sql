-- 008_profiles_timezone_and_user_trigger.sql
-- Adds timezone to profiles and wires automatic profile creation on signup.
--
-- Prior state: handle_new_user() did not exist; no trigger on auth.users fired on INSERT.
-- on_profile_created_create_space (fires on public.profiles INSERT) is left untouched —
-- it will now fire correctly as a side effect once profiles are being created here.

-- 1. Add timezone column to profiles (idempotent)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS timezone text NOT NULL DEFAULT 'UTC';

-- 2. Create handle_new_user() trigger function.
--    SECURITY DEFINER so it runs as the function owner (postgres) and can INSERT into
--    public.profiles despite RLS being enabled. search_path locked to public for safety.
--    Captures display_name and timezone from raw_user_meta_data when present.
--    Wraps in EXCEPTION so a failure here never blocks user signup.
CREATE OR REPLACE FUNCTION public.handle_new_user()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, timezone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'timezone', 'UTC')
  );
  RETURN NEW;
EXCEPTION WHEN others THEN
  RAISE WARNING '[handle_new_user] Failed to create profile for user %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

-- 3. Wire trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
