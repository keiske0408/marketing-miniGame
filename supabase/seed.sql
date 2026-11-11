-- ==============================================================================
-- Grand Vintage Wine Event — Database Seed Script
-- Creates the Château Administrator User and Default Event Configuration
-- Paste this into your Supabase SQL Editor and click "Run"
-- ==============================================================================

-- 1. Seed the Château Grand Admin in public.profiles
INSERT INTO public.profiles (id, display_name, email, phone, role, created_at)
VALUES (
  'admin-chateau-01',
  'Château Grand Admin',
  'admin@chateauvintage.com',
  '+1 (555) 789-VINO',
  'admin',
  timezone('utc'::text, now())
)
ON CONFLICT (id) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  email = EXCLUDED.email,
  phone = EXCLUDED.phone,
  role = 'admin';

-- 2. Seed Admin Event Settings (Controls the Perfect Pour kiosk target & sound)
INSERT INTO public.user_settings (user_id, settings, updated_at)
VALUES (
  'admin-chateau-01',
  '{
    "masterVolume": 85,
    "musicVolume": 70,
    "sfxVolume": 85,
    "muted": false,
    "haptics": true,
    "reducedMotion": false,
    "theme": "auto",
    "language": "en",
    "difficulty": "normal",
    "timerTargetMode": "fixed",
    "timerCustomTarget": 5.0
  }'::jsonb,
  timezone('utc'::text, now())
)
ON CONFLICT (user_id) DO UPDATE SET
  settings = EXCLUDED.settings,
  updated_at = EXCLUDED.updated_at;

-- 3. Seed Admin Event Consents
INSERT INTO public.consents (user_id, terms_accepted, marketing_accepted, consented_at)
VALUES (
  'admin-chateau-01',
  true,
  true,
  timezone('utc'::text, now())
)
ON CONFLICT (user_id) DO UPDATE SET
  terms_accepted = true,
  marketing_accepted = true;

-- 4. Baseline High Scores on Event Leaderboard
INSERT INTO public.scores (user_id, display_name, game_mode, score, level, accuracy, created_at)
VALUES
  ('admin-chateau-01', 'Château Grand Admin', 'picture-match', 250, 1, 100, timezone('utc'::text, now() - interval '2 hours')),
  ('admin-chateau-01', 'Château Grand Admin', 'target-timer', 150, 1, 99, timezone('utc'::text, now() - interval '1 hour'))
ON CONFLICT DO NOTHING;

