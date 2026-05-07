
-- Storage UPDATE policy for workout-media
CREATE POLICY "Workout media owner update"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'workout-media' AND (auth.uid())::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'workout-media' AND (auth.uid())::text = (storage.foldername(name))[1]);

-- Restrict search_profiles & get_public_profile to authenticated users only
REVOKE EXECUTE ON FUNCTION public.search_profiles(text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_public_profile(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.search_profiles(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_profile(uuid) TO authenticated;
