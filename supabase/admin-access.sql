-- Existing installations: run this once in the Supabase SQL Editor.
-- New installations: run schema.sql first, then this script.
BEGIN;

DROP POLICY IF EXISTS "Public read profiles" ON public.profiles;
DROP POLICY IF EXISTS "Event attendees can register and update profile" ON public.profiles;
DROP POLICY IF EXISTS "Attendees manage own settings" ON public.user_settings;
DROP POLICY IF EXISTS "Attendees record consents" ON public.consents;
DROP POLICY IF EXISTS "Public can view top scores" ON public.scores;
DROP POLICY IF EXISTS "Allow score submissions" ON public.scores;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scores ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.profiles, public.user_settings, public.consents, public.scores FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_settings, public.consents TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.scores TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO service_role;
GRANT SELECT, INSERT ON public.scores TO service_role;

DROP POLICY IF EXISTS "Event admins manage profiles" ON public.profiles;
CREATE POLICY "Event admins manage profiles" ON public.profiles
  FOR ALL TO authenticated
  USING ((SELECT auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  WITH CHECK ((SELECT auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

DROP POLICY IF EXISTS "Event admins manage settings" ON public.user_settings;
CREATE POLICY "Event admins manage settings" ON public.user_settings
  FOR ALL TO authenticated
  USING ((SELECT auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  WITH CHECK ((SELECT auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

DROP POLICY IF EXISTS "Event admins manage consents" ON public.consents;
CREATE POLICY "Event admins manage consents" ON public.consents
  FOR ALL TO authenticated
  USING ((SELECT auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  WITH CHECK ((SELECT auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

DROP POLICY IF EXISTS "Event admins manage scores" ON public.scores;
CREATE POLICY "Event admins manage scores" ON public.scores
  FOR ALL TO authenticated
  USING ((SELECT auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  WITH CHECK (
    (SELECT auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    AND score BETWEEN 0 AND 500 AND accuracy BETWEEN 0 AND 100
  );

COMMIT;
