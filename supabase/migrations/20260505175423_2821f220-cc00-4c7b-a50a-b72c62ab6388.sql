
-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  username TEXT UNIQUE,
  avatar_url TEXT,
  birth_date DATE,
  gender TEXT,
  height_cm NUMERIC,
  weight_kg NUMERIC,
  resting_hr INT,
  max_hr INT,
  fitness_level TEXT,
  primary_sport TEXT,
  weekly_goal_km NUMERIC,
  bio TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles viewable by owner" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users delete own profile" ON public.profiles FOR DELETE USING (auth.uid() = id);

-- Workouts
CREATE TABLE public.workouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sport TEXT NOT NULL DEFAULT 'running',
  title TEXT,
  notes TEXT,
  workout_date DATE NOT NULL DEFAULT CURRENT_DATE,
  distance_km NUMERIC,
  duration_seconds INT,
  pace_seconds_per_km INT,
  avg_heart_rate INT,
  max_heart_rate INT,
  elevation_gain_m NUMERIC,
  calories INT,
  perceived_effort INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.workouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workouts owner select" ON public.workouts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Workouts owner insert" ON public.workouts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Workouts owner update" ON public.workouts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Workouts owner delete" ON public.workouts FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_workouts_user_date ON public.workouts(user_id, workout_date DESC);

-- Training plan items
CREATE TABLE public.plan_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scheduled_date DATE NOT NULL,
  sport TEXT NOT NULL DEFAULT 'running',
  title TEXT NOT NULL,
  description TEXT,
  target_distance_km NUMERIC,
  target_duration_minutes INT,
  intensity TEXT,
  completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.plan_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Plan owner select" ON public.plan_items FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Plan owner insert" ON public.plan_items FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Plan owner update" ON public.plan_items FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Plan owner delete" ON public.plan_items FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_plan_user_date ON public.plan_items(user_id, scheduled_date);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''));
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
