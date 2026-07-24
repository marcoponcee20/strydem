-- Remove the overly permissive policy we added earlier.
DROP POLICY IF EXISTS "Authenticated users can discover public profiles" ON public.profiles;

-- Scoped public view for the Discover feature: only fields that are meant to be public.
CREATE OR REPLACE VIEW public.public_profiles AS
  SELECT id, full_name, username, avatar_url, bio, primary_sport, fitness_level, weekly_goal_km
  FROM public.profiles;

ALTER VIEW public.public_profiles OWNER TO postgres;
GRANT SELECT ON public.public_profiles TO authenticated;

-- Public aggregate stats view for the landing page.
CREATE OR REPLACE VIEW public.public_stats AS
  SELECT
    (SELECT COUNT(*) FROM public.profiles)::bigint AS athletes,
    COALESCE((SELECT SUM(distance_km) FROM public.workouts), 0)::numeric AS total_km,
    (SELECT COUNT(*) FROM public.workouts)::bigint AS total_workouts;

ALTER VIEW public.public_stats OWNER TO postgres;
GRANT SELECT ON public.public_stats TO anon, authenticated;

-- Update profile discovery functions to use the scoped view and run as the caller.
CREATE OR REPLACE FUNCTION public.search_profiles(q text)
RETURNS TABLE(id uuid, full_name text, username text, avatar_url text, bio text, primary_sport text)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT id, full_name, username, avatar_url, bio, primary_sport
  FROM public.public_profiles
  WHERE (q IS NULL OR q = '' OR full_name ILIKE '%'||q||'%' OR username ILIKE '%'||q||'%')
  ORDER BY full_name NULLS LAST
  LIMIT 50;
$$;

CREATE OR REPLACE FUNCTION public.get_public_profile(profile_id uuid)
RETURNS TABLE(id uuid, full_name text, username text, avatar_url text, bio text, primary_sport text, fitness_level text, weekly_goal_km numeric)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT id, full_name, username, avatar_url, bio, primary_sport, fitness_level, weekly_goal_km
  FROM public.public_profiles
  WHERE id = profile_id
  LIMIT 1;
$$;

-- Update public stats function to use the view and run as the caller.
CREATE OR REPLACE FUNCTION public.get_public_stats()
RETURNS TABLE(athletes bigint, total_km numeric, total_workouts bigint)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT athletes, total_km, total_workouts
  FROM public.public_stats;
$$;