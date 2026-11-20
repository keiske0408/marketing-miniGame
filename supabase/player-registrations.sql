-- Run after schema.sql and admin-access.sql on new and existing installations.
BEGIN;

CREATE TABLE IF NOT EXISTS public.player_registrations (
  id UUID PRIMARY KEY,
  operator_id UUID NOT NULL DEFAULT auth.uid(),
  name TEXT,
  email TEXT,
  phone TEXT,
  consented_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS player_registrations_operator_id_idx
  ON public.player_registrations (operator_id);

ALTER TABLE public.player_registrations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.player_registrations FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, DELETE ON public.player_registrations TO authenticated;

DROP POLICY IF EXISTS "Admins read own registrations" ON public.player_registrations;
CREATE POLICY "Admins read own registrations" ON public.player_registrations
  FOR SELECT TO authenticated
  USING ((SELECT auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    AND operator_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Admins create own registrations" ON public.player_registrations;
CREATE POLICY "Admins create own registrations" ON public.player_registrations
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    AND operator_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Admins delete own registrations" ON public.player_registrations;
CREATE POLICY "Admins delete own registrations" ON public.player_registrations
  FOR DELETE TO authenticated
  USING ((SELECT auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    AND operator_id = (SELECT auth.uid()));

COMMIT;
