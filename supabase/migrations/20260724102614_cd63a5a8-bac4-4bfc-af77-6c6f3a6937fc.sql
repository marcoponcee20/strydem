-- Drop the regular views that the linter flagged as security-definer
DROP VIEW IF EXISTS public.public_profiles;
DROP VIEW IF EXISTS public.public_stats;

-- Public-facing materialized views: snapshots of only public data, refreshed by internal triggers
CREATE MATERIALIZED VIEW IF NOT EXISTS public.public_profiles AS
SELECT id, full_name, username, avatar_url, bio, primary_sport, fitness_level, weekly_goal_km
FROM public.profiles;
CREATE UNIQUE INDEX IF NOT EXISTS idx_public_profiles_id ON public.public_profiles(id);

CREATE MATERIALIZED VIEW IF NOT EXISTS public.public_stats AS
SELECT
  (SELECT count(*) FROM public.profiles) AS athletes,
  (SELECT COALESCE(sum(distance_km), 0) FROM public.workouts) AS total_km,
  (SELECT count(*) FROM public.workouts) AS total_workouts;
CREATE UNIQUE INDEX IF NOT EXISTS idx_public_stats_singleton ON public.public_stats((1));

-- API access to the views
GRANT SELECT ON public.public_profiles TO authenticated;
GRANT SELECT ON public.public_stats TO anon, authenticated;

-- Internal trigger functions (not exposed via API) to keep the views up to date
CREATE OR REPLACE FUNCTION public.refresh_public_profiles()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.public_profiles;
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.refresh_public_stats()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.public_stats;
  RETURN NULL;
END;
$$;

-- Triggers refresh on data changes
DROP TRIGGER IF EXISTS tr_refresh_public_profiles_profiles ON public.profiles;
CREATE TRIGGER tr_refresh_public_profiles_profiles
AFTER INSERT OR UPDATE OR DELETE ON public.profiles
FOR EACH STATEMENT
EXECUTE FUNCTION public.refresh_public_profiles();

DROP TRIGGER IF EXISTS tr_refresh_public_stats_workouts ON public.workouts;
CREATE TRIGGER tr_refresh_public_stats_workouts
AFTER INSERT OR UPDATE OR DELETE ON public.workouts
FOR EACH STATEMENT
EXECUTE FUNCTION public.refresh_public_stats();

-- Ensure the old SECURITY DEFINER RPC functions are gone
DROP FUNCTION IF EXISTS public.get_public_profile(uuid);
DROP FUNCTION IF EXISTS public.search_profiles(text);
DROP FUNCTION IF EXISTS public.get_public_stats();