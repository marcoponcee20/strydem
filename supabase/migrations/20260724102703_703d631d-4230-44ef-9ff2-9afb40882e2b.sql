-- Clean up the previous approaches (functions, views, materialized views, triggers)
DROP FUNCTION IF EXISTS public.get_public_profile(uuid);
DROP FUNCTION IF EXISTS public.search_profiles(text);
DROP FUNCTION IF EXISTS public.get_public_stats();
DROP TRIGGER IF EXISTS tr_refresh_public_profiles_profiles ON public.profiles;
DROP TRIGGER IF EXISTS tr_refresh_public_stats_workouts ON public.workouts;
DROP FUNCTION IF EXISTS public.refresh_public_profiles();
DROP FUNCTION IF EXISTS public.refresh_public_stats();
DROP MATERIALIZED VIEW IF EXISTS public.public_profiles;
DROP MATERIALIZED VIEW IF EXISTS public.public_stats;
DROP VIEW IF EXISTS public.public_profiles;
DROP VIEW IF EXISTS public.public_stats;

-- Internal schema for non-API trigger functions
CREATE SCHEMA IF NOT EXISTS internal;

-- Public table that mirrors only the public profile fields
CREATE TABLE IF NOT EXISTS public.public_profiles (
  id uuid PRIMARY KEY,
  full_name text,
  username text,
  avatar_url text,
  bio text,
  primary_sport text,
  fitness_level text,
  weekly_goal_km numeric
);

-- Public stats table with a single row
CREATE TABLE IF NOT EXISTS public.public_stats (
  id integer PRIMARY KEY CHECK (id = 1),
  athletes bigint DEFAULT 0,
  total_km numeric DEFAULT 0,
  total_workouts bigint DEFAULT 0
);

-- Populate the public tables with current data
INSERT INTO public.public_profiles (id, full_name, username, avatar_url, bio, primary_sport, fitness_level, weekly_goal_km)
SELECT id, full_name, username, avatar_url, bio, primary_sport, fitness_level, weekly_goal_km
FROM public.profiles
ON CONFLICT (id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  username = EXCLUDED.username,
  avatar_url = EXCLUDED.avatar_url,
  bio = EXCLUDED.bio,
  primary_sport = EXCLUDED.primary_sport,
  fitness_level = EXCLUDED.fitness_level,
  weekly_goal_km = EXCLUDED.weekly_goal_km;

INSERT INTO public.public_stats (id, athletes, total_km, total_workouts)
VALUES (1,
  (SELECT count(*) FROM public.profiles),
  (SELECT COALESCE(sum(distance_km), 0) FROM public.workouts),
  (SELECT count(*) FROM public.workouts)
)
ON CONFLICT (id) DO UPDATE SET
  athletes = EXCLUDED.athletes,
  total_km = EXCLUDED.total_km,
  total_workouts = EXCLUDED.total_workouts;

-- API access to the public tables
GRANT SELECT ON public.public_profiles TO authenticated;
GRANT SELECT ON public.public_stats TO anon, authenticated;

-- Internal trigger function that keeps public_profiles in sync with profiles
CREATE OR REPLACE FUNCTION internal.sync_public_profiles()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.public_profiles WHERE id = OLD.id;
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO public.public_profiles (id, full_name, username, avatar_url, bio, primary_sport, fitness_level, weekly_goal_km)
    VALUES (NEW.id, NEW.full_name, NEW.username, NEW.avatar_url, NEW.bio, NEW.primary_sport, NEW.fitness_level, NEW.weekly_goal_km)
    ON CONFLICT (id) DO NOTHING;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.public_profiles (id, full_name, username, avatar_url, bio, primary_sport, fitness_level, weekly_goal_km)
    VALUES (NEW.id, NEW.full_name, NEW.username, NEW.avatar_url, NEW.bio, NEW.primary_sport, NEW.fitness_level, NEW.weekly_goal_km)
    ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name,
      username = EXCLUDED.username,
      avatar_url = EXCLUDED.avatar_url,
      bio = EXCLUDED.bio,
      primary_sport = EXCLUDED.primary_sport,
      fitness_level = EXCLUDED.fitness_level,
      weekly_goal_km = EXCLUDED.weekly_goal_km;
  END IF;
  RETURN NULL;
END;
$$;

-- Internal trigger function that recalculates public_stats
CREATE OR REPLACE FUNCTION internal.recalc_public_stats()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.public_stats
  SET athletes = (SELECT count(*) FROM public.profiles),
      total_km = (SELECT COALESCE(sum(distance_km), 0) FROM public.workouts),
      total_workouts = (SELECT count(*) FROM public.workouts)
  WHERE id = 1;
  RETURN NULL;
END;
$$;

-- Triggers that keep public tables up to date
DROP TRIGGER IF EXISTS tr_sync_public_profiles ON public.profiles;
CREATE TRIGGER tr_sync_public_profiles
AFTER INSERT OR UPDATE OR DELETE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION internal.sync_public_profiles();

DROP TRIGGER IF EXISTS tr_recalc_public_stats_profiles ON public.profiles;
CREATE TRIGGER tr_recalc_public_stats_profiles
AFTER INSERT OR UPDATE OR DELETE ON public.profiles
FOR EACH STATEMENT
EXECUTE FUNCTION internal.recalc_public_stats();

DROP TRIGGER IF EXISTS tr_recalc_public_stats_workouts ON public.workouts;
CREATE TRIGGER tr_recalc_public_stats_workouts
AFTER INSERT OR UPDATE OR DELETE ON public.workouts
FOR EACH STATEMENT
EXECUTE FUNCTION internal.recalc_public_stats();

-- Keep internal functions out of the API; default PUBLIC grant is enough for triggers to fire
-- because the public tables are in the API schema and the triggers are owned by postgres.
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA internal FROM PUBLIC;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA internal FROM anon, authenticated;
GRANT USAGE ON SCHEMA internal TO postgres, service_role;
GRANT EXECUTE ON FUNCTION internal.sync_public_profiles() TO authenticated;
GRANT EXECUTE ON FUNCTION internal.recalc_public_stats() TO authenticated;
