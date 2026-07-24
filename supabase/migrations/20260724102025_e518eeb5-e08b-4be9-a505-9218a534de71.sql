-- Allow authenticated users to discover each other's public profiles (required for the Discover feature).
CREATE POLICY "Authenticated users can discover public profiles" ON public.profiles FOR SELECT TO authenticated USING (true);

-- Switch profile lookup functions to SECURITY INVOKER so they run under the caller's role.
-- The Discover feature now relies on the explicit RLS policy above.
ALTER FUNCTION public.search_profiles(text) SECURITY INVOKER;
ALTER FUNCTION public.get_public_profile(uuid) SECURITY INVOKER;