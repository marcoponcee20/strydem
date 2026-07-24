REVOKE EXECUTE ON FUNCTION public.get_public_profile(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_public_profile(uuid) TO authenticated;