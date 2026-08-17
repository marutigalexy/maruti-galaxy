-- Auth dashboard user create: copy into public.users as an active admin.
-- Apply after migration_01.sql, migration_02.sql, and migration_03.sql.
-- Password stays in Auth only. v1 role is admin only (R-28).

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_name text;
  v_email text;
BEGIN
  v_email := lower(btrim(COALESCE(NEW.email, '')));
  IF v_email = '' THEN
    RETURN NEW;
  END IF;

  v_name := NULLIF(btrim(COALESCE(NEW.raw_user_meta_data ->> 'name', '')), '');
  IF v_name IS NULL THEN
    v_name := split_part(v_email, '@', 1);
  END IF;
  IF v_name = '' THEN
    v_name := 'Admin';
  END IF;

  INSERT INTO public.users (id, name, email, role, is_active)
  VALUES (NEW.id, v_name, v_email, 'admin', true)
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.handle_new_auth_user() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_auth_user();

INSERT INTO public.users (id, name, email, role, is_active)
SELECT
  u.id,
  COALESCE(
    NULLIF(btrim(COALESCE(u.raw_user_meta_data ->> 'name', '')), ''),
    NULLIF(split_part(lower(btrim(u.email)), '@', 1), ''),
    'Admin'
  ),
  lower(btrim(u.email)),
  'admin',
  true
FROM auth.users AS u
WHERE u.email IS NOT NULL
  AND btrim(u.email) <> ''
ON CONFLICT (id) DO NOTHING;
