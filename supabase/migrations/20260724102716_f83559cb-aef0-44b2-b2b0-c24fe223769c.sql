ALTER TABLE public.public_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.public_stats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read public profiles" ON public.public_profiles;
DROP POLICY IF EXISTS "Anyone can read public stats" ON public.public_stats;

CREATE POLICY "Authenticated users can read public profiles"
ON public.public_profiles
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Anyone can read public stats"
ON public.public_stats
FOR SELECT
TO anon, authenticated
USING (true);

-- No INSERT/UPDATE/DELETE policies: public tables are maintained by internal triggers only
-- (the trigger functions are SECURITY DEFINER in the internal schema and bypass RLS).

GRANT SELECT ON public.public_profiles TO authenticated;
GRANT SELECT ON public.public_stats TO anon, authenticated;
GRANT ALL ON public.public_profiles TO service_role;
GRANT ALL ON public.public_stats TO service_role;
