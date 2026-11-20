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
  role TEXT NOT NULL DEFAULT 'player',
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Ensure role column exists if table was created in an earlier migration
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'player';

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 2. User Settings table
CREATE TABLE IF NOT EXISTS public.user_settings (
  user_id TEXT REFERENCES public.profiles(id) ON DELETE CASCADE PRIMARY KEY,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- 3. Consents table (Terms & Privacy + Optional Wine Club Marketing)
CREATE TABLE IF NOT EXISTS public.consents (
  user_id TEXT REFERENCES public.profiles(id) ON DELETE CASCADE PRIMARY KEY,
  terms_accepted BOOLEAN NOT NULL DEFAULT true,
  marketing_accepted BOOLEAN NOT NULL DEFAULT false,
  consented_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.consents ENABLE ROW LEVEL SECURITY;

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

-- No public access, even before admin-access.sql is applied.
REVOKE ALL ON public.profiles, public.user_settings, public.consents, public.scores FROM PUBLIC, anon, authenticated;
-- Next run admin-access.sql to remove legacy policies and grant admin access.
