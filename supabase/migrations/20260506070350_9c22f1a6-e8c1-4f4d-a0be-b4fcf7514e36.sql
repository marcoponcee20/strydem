-- workout_media table
CREATE TABLE public.workout_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id uuid NOT NULL REFERENCES public.workouts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  storage_path text NOT NULL,
  mime_type text,
  kind text NOT NULL DEFAULT 'image',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.workout_media ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Media owner select" ON public.workout_media FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Media owner insert" ON public.workout_media FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Media owner delete" ON public.workout_media FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_workout_media_workout ON public.workout_media(workout_id);

-- Storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('workout-media', 'workout-media', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Workout media select own" ON storage.objects FOR SELECT
  USING (bucket_id = 'workout-media' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Workout media insert own" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'workout-media' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Workout media delete own" ON storage.objects FOR DELETE
  USING (bucket_id = 'workout-media' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Public profiles view (safe fields only, bypasses RLS on profiles)
CREATE OR REPLACE VIEW public.public_profiles
WITH (security_invoker = false) AS
SELECT id, full_name, username, avatar_url, bio, primary_sport
FROM public.profiles;

GRANT SELECT ON public.public_profiles TO authenticated, anon;