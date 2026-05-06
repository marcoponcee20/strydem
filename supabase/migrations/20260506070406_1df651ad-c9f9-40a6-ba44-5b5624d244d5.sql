DROP VIEW IF EXISTS public.public_profiles;

CREATE OR REPLACE FUNCTION public.search_profiles(q text)
RETURNS TABLE (id uuid, full_name text, username text, avatar_url text, bio text, primary_sport text)
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

GRANT EXECUTE ON FUNCTION public.search_profiles(text) TO authenticated;