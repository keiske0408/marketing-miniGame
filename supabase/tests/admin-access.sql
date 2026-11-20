-- Run only in a designated test project after schema.sql and admin-access.sql.
-- All fixtures and writes are rolled back.
BEGIN;

INSERT INTO public.profiles (id, display_name, role)
VALUES ('admin-access-test', 'Access test', 'admin');
INSERT INTO public.user_settings (user_id) VALUES ('admin-access-test');
INSERT INTO public.consents (user_id) VALUES ('admin-access-test');
INSERT INTO public.scores (user_id, score, level, accuracy)
VALUES ('admin-access-test', 1, 1, 100);

SET LOCAL ROLE anon;
DO $$
DECLARE table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['profiles', 'user_settings', 'consents', 'scores'] LOOP
    BEGIN
      EXECUTE format('SELECT 1 FROM public.%I LIMIT 1', table_name);
      RAISE EXCEPTION 'Anonymous read unexpectedly allowed: %', table_name;
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;
    IF has_table_privilege('anon', 'public.' || table_name, 'INSERT')
      OR has_table_privilege('anon', 'public.' || table_name, 'UPDATE')
      OR has_table_privilege('anon', 'public.' || table_name, 'DELETE') THEN
      RAISE EXCEPTION 'Anonymous write grant exists: %', table_name;
    END IF;
  END LOOP;
END $$;
RESET ROLE;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-000000000001","role":"authenticated","app_metadata":{"role":"player"},"user_metadata":{"role":"admin"}}', true);
DO $$
DECLARE table_name TEXT; visible BIGINT; changed BIGINT; statement TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['profiles', 'user_settings', 'consents', 'scores'] LOOP
    EXECUTE format('SELECT count(*) FROM public.%I', table_name) INTO visible;
    IF visible <> 0 THEN RAISE EXCEPTION 'Non-admin read unexpectedly allowed: %', table_name; END IF;
  END LOOP;
  FOREACH statement IN ARRAY ARRAY[
    'INSERT INTO public.profiles (id, display_name, role) VALUES (''non-admin-test'', ''Denied'', ''admin'')',
    'INSERT INTO public.user_settings (user_id) VALUES (''admin-access-test'') ON CONFLICT (user_id) DO UPDATE SET settings = ''{}''',
    'INSERT INTO public.consents (user_id) VALUES (''admin-access-test'') ON CONFLICT (user_id) DO UPDATE SET terms_accepted = true',
    'INSERT INTO public.scores (user_id, score, level, accuracy) VALUES (''admin-access-test'', 1, 1, 100)'
  ] LOOP
    BEGIN
      EXECUTE statement;
      RAISE EXCEPTION 'Non-admin write unexpectedly allowed';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;
  END LOOP;
  UPDATE public.profiles SET display_name = 'Denied' WHERE id = 'admin-access-test';
  GET DIAGNOSTICS changed = ROW_COUNT;
  IF changed <> 0 THEN RAISE EXCEPTION 'Non-admin update unexpectedly allowed'; END IF;
  DELETE FROM public.scores WHERE user_id = 'admin-access-test';
  GET DIAGNOSTICS changed = ROW_COUNT;
  IF changed <> 0 THEN RAISE EXCEPTION 'Non-admin delete unexpectedly allowed'; END IF;
END $$;

SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-000000000001","role":"authenticated","app_metadata":{"role":"admin"}}', true);
DO $$
DECLARE table_name TEXT; visible BIGINT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['profiles', 'user_settings', 'consents', 'scores'] LOOP
    EXECUTE format('SELECT count(*) FROM public.%I WHERE %I = $1', table_name,
      CASE WHEN table_name = 'profiles' THEN 'id' ELSE 'user_id' END)
      INTO visible USING 'admin-access-test';
    IF visible < 1 THEN RAISE EXCEPTION 'Admin read denied: %', table_name; END IF;
  END LOOP;
END $$;
INSERT INTO public.profiles (id, display_name) VALUES ('admin-write-test', 'Admin write');
UPDATE public.profiles SET display_name = 'Updated' WHERE id = 'admin-write-test';
INSERT INTO public.user_settings (user_id) VALUES ('admin-write-test');
UPDATE public.user_settings SET settings = '{"language":"en"}' WHERE user_id = 'admin-write-test';
INSERT INTO public.consents (user_id) VALUES ('admin-write-test');
UPDATE public.consents SET marketing_accepted = false WHERE user_id = 'admin-write-test';
INSERT INTO public.scores (user_id, score, level, accuracy) VALUES ('admin-write-test', 2, 1, 100);
DELETE FROM public.scores WHERE user_id = 'admin-write-test';
DELETE FROM public.consents WHERE user_id = 'admin-write-test';
DELETE FROM public.user_settings WHERE user_id = 'admin-write-test';

RESET ROLE;
SET LOCAL ROLE service_role;
INSERT INTO public.profiles (id, display_name, role)
VALUES ('seed-access-test', 'Seed access', 'admin')
ON CONFLICT (id) DO UPDATE SET display_name = EXCLUDED.display_name;
INSERT INTO public.scores (user_id, score, level, accuracy)
VALUES ('seed-access-test', 2, 1, 100);
SELECT count(*) FROM public.scores WHERE user_id = 'seed-access-test';

RESET ROLE;
ROLLBACK;
