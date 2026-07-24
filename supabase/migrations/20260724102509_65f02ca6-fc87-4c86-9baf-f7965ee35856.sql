-- Public read-only view of athlete profiles (replaces get_public_profile + search_profiles RPCs)
CREATE OR REPLACE VIEW public.public_profiles AS
SELECT id, full_name, username, avatar_url, bio, primary_sport, fitness_level, weekly_goal_km
FROM public.profiles;

-- Public stats view for landing page (replaces get_public_stats RPC)
CREATE OR REPLACE VIEW public.public_stats AS
SELECT
  (SELECT count(*) FROM public.profiles) AS athletes,
  (SELECT COALESCE(sum(distance_km), 0) FROM public.workouts) AS total_km,
  (SELECT count(*) FROM public.workouts) AS total_workouts;

-- Expose views to the roles that need them
GRANT SELECT ON public.public_profiles TO authenticated;
GRANT SELECT ON public.public_stats TO anon, authenticated;

-- Remove the SECURITY DEFINER functions flagged by the linter
DROP FUNCTION IF EXISTS public.get_public_profile(uuid);
DROP FUNCTION IF EXISTS public.search_profiles(text);
DROP FUNCTION IF EXISTS public.get_public_stats();