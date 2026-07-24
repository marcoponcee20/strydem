-- Drop the views that caused security-definer-view errors.
DROP VIEW IF EXISTS public.public_profiles;
DROP VIEW IF EXISTS public.public_stats;

-- Make sure the broad policy is gone.
DROP POLICY IF EXISTS "Authenticated users can discover public profiles" ON public.profiles;

-- Restore functions as SECURITY DEFINER, which is the intended pattern for scoped public RPCs.
CREATE OR REPLACE FUNCTION public.search_profiles(q text)
RETURNS TABLE(id uuid, full_name text, username text, avatar_url text, bio text, primary_sport text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, full_name, username, avatar_url, bio, primary_sport
  FROM public.profiles
  WHERE (q IS NULL OR q = '' OR full_name ILIKE '%'||q||'%' OR username ILIKE '%'||q||'%')
  ORDER BY full_name NULLS LAST
  LIMIT 50;
$$;

CREATE OR REPLACE FUNCTION public.get_public_profile(profile_id uuid)
RETURNS TABLE(id uuid, full_name text, username text, avatar_url text, bio text, primary_sport text, fitness_level text, weekly_goal_km numeric)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, full_name, username, avatar_url, bio, primary_sport, fitness_level, weekly_goal_km
  FROM public.profiles
  WHERE id = profile_id
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_public_stats()
RETURNS TABLE(athletes bigint, total_km numeric, total_workouts bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    (SELECT COUNT(*) FROM public.profiles)::bigint AS athletes,
    COALESCE((SELECT SUM(distance_km) FROM public.workouts), 0)::numeric AS total_km,
    (SELECT COUNT(*) FROM public.workouts)::bigint AS total_workouts;
$$;