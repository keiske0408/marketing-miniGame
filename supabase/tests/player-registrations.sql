-- Run only in a designated test project after player-registrations.sql.
BEGIN;

SET LOCAL ROLE anon;
DO $$
BEGIN
  IF has_table_privilege('anon', 'public.player_registrations', 'SELECT')
    OR has_table_privilege('anon', 'public.player_registrations', 'INSERT')
    OR has_table_privilege('anon', 'public.player_registrations', 'DELETE') THEN
    RAISE EXCEPTION 'Anonymous registration privileges exist';
  END IF;
END $$;
RESET ROLE;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-000000000001","role":"authenticated","app_metadata":{"role":"player"}}', true);
DO $$
BEGIN
  BEGIN
    INSERT INTO public.player_registrations (id) VALUES ('10000000-0000-4000-8000-000000000001');
    RAISE EXCEPTION 'Non-admin insert unexpectedly allowed';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  IF EXISTS (SELECT 1 FROM public.player_registrations) THEN
    RAISE EXCEPTION 'Non-admin read unexpectedly allowed';
  END IF;
END $$;

SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-000000000001","role":"authenticated","app_metadata":{"role":"admin"}}', true);
INSERT INTO public.player_registrations (id, email, phone)
VALUES ('10000000-0000-4000-8000-000000000001', 'test@example.invalid', '000');
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.player_registrations
    WHERE id = '10000000-0000-4000-8000-000000000001' AND consented_at IS NOT NULL AND name IS NULL) THEN
    RAISE EXCEPTION 'Admin registration read failed';
  END IF;
  BEGIN
    INSERT INTO public.player_registrations (id, operator_id)
    VALUES ('10000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000002');
    RAISE EXCEPTION 'Insert for another operator unexpectedly allowed';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END $$;

SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-000000000003","role":"authenticated","app_metadata":{"role":"player"},"user_metadata":{"role":"admin"}}', true);
DO $$
DECLARE changed BIGINT;
BEGIN
  IF EXISTS (SELECT 1 FROM public.player_registrations WHERE id = '10000000-0000-4000-8000-000000000001') THEN
    RAISE EXCEPTION 'Non-admin read unexpectedly allowed';
  END IF;
  DELETE FROM public.player_registrations WHERE id = '10000000-0000-4000-8000-000000000001';
  GET DIAGNOSTICS changed = ROW_COUNT;
  IF changed <> 0 THEN RAISE EXCEPTION 'Non-admin delete unexpectedly allowed'; END IF;
END $$;

SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-000000000002","role":"authenticated","app_metadata":{"role":"admin"}}', true);
DO $$
DECLARE changed BIGINT;
BEGIN
  IF EXISTS (SELECT 1 FROM public.player_registrations WHERE id = '10000000-0000-4000-8000-000000000001') THEN
    RAISE EXCEPTION 'Another admin can read the registration';
  END IF;
  DELETE FROM public.player_registrations WHERE id = '10000000-0000-4000-8000-000000000001';
  GET DIAGNOSTICS changed = ROW_COUNT;
  IF changed <> 0 THEN RAISE EXCEPTION 'Another admin can delete the registration'; END IF;
END $$;

SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-000000000001","role":"authenticated","app_metadata":{"role":"admin"}}', true);
DO $$
DECLARE changed BIGINT;
BEGIN
  DELETE FROM public.player_registrations WHERE id = '10000000-0000-4000-8000-000000000001';
  GET DIAGNOSTICS changed = ROW_COUNT;
  IF changed <> 1 THEN RAISE EXCEPTION 'Owning admin could not delete registration'; END IF;
END $$;

RESET ROLE;
ROLLBACK;
