-- ==============================================================================
-- Grand Vintage Wine Event - Supabase Schema & Row Level Security (RLS)
-- Paste this into your Supabase SQL Editor and click "Run"
-- ==============================================================================

-- 1. Profiles table (Instant Event Registration)
CREATE TABLE IF NOT EXISTS public.profiles (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read profiles" ON public.profiles;
CREATE POLICY "Public read profiles"
  ON public.profiles FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Event attendees can register and update profile" ON public.profiles;
CREATE POLICY "Event attendees can register and update profile"
  ON public.profiles FOR ALL
  USING (true)
  WITH CHECK (true);


-- 2. User Settings table
CREATE TABLE IF NOT EXISTS public.user_settings (
  user_id TEXT REFERENCES public.profiles(id) ON DELETE CASCADE PRIMARY KEY,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Attendees manage own settings" ON public.user_settings;
CREATE POLICY "Attendees manage own settings"
  ON public.user_settings FOR ALL
  USING (true)
  WITH CHECK (true);


-- 3. Consents table (Terms & Privacy + Optional Wine Club Marketing)
CREATE TABLE IF NOT EXISTS public.consents (
  user_id TEXT REFERENCES public.profiles(id) ON DELETE CASCADE PRIMARY KEY,
  terms_accepted BOOLEAN NOT NULL DEFAULT true,
  marketing_accepted BOOLEAN NOT NULL DEFAULT false,
  consented_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.consents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Attendees record consents" ON public.consents;
CREATE POLICY "Attendees record consents"
  ON public.consents FOR ALL
  USING (true)
  WITH CHECK (true);


-- 4. Scores table (Supports both Vintage Picture Match & Perfect Pour Timer)
CREATE TABLE IF NOT EXISTS public.scores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  display_name TEXT NOT NULL DEFAULT 'Guest Sommelier',
  game_mode TEXT NOT NULL DEFAULT 'picture-match',
  score INTEGER NOT NULL,
  level INTEGER NOT NULL,
  accuracy INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.scores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view top scores" ON public.scores;
CREATE POLICY "Public can view top scores"
  ON public.scores FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Allow score submissions" ON public.scores;
CREATE POLICY "Allow score submissions"
  ON public.scores FOR INSERT
  WITH CHECK (score >= 0 AND score <= 500 AND accuracy >= 0 AND accuracy <= 100);
