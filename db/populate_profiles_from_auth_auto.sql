-- Safe admin migration: detect which metadata column exists on auth.users and upsert profiles
-- Run this in Supabase SQL editor as an admin (Service Role) only.
-- This script will:
--  - Detect whether `user_metadata` (json) or `raw_user_meta_data` (text) exists
--  - Extract username/full_name accordingly and upsert into public.profiles
--  - If neither metadata column exists, it will upsert only id/email

DO $$
DECLARE
  has_user_meta BOOLEAN;
  has_raw_meta BOOLEAN;
BEGIN
  SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema = 'auth' AND table_name = 'users' AND column_name = 'user_metadata') INTO has_user_meta;
  SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema = 'auth' AND table_name = 'users' AND column_name = 'raw_user_meta_data') INTO has_raw_meta;

  IF has_user_meta THEN
    RAISE NOTICE 'Using user_metadata column';
    EXECUTE $exec$
      INSERT INTO public.profiles (id, email, username, full_name)
      SELECT
        u.id,
        u.email,
        COALESCE(u.user_metadata->>'preferred_username', u.user_metadata->>'username', NULL) AS username,
        COALESCE(u.user_metadata->>'full_name', u.user_metadata->>'fullName', u.user_metadata->>'name') AS full_name
      FROM auth.users u
      WHERE u.email IS NOT NULL
      ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        username = CASE WHEN profiles.username IS NULL OR profiles.username = '' THEN EXCLUDED.username ELSE profiles.username END,
        full_name = CASE WHEN profiles.full_name IS NULL OR profiles.full_name = '' THEN EXCLUDED.full_name ELSE profiles.full_name END;
    $exec$;

  ELSIF has_raw_meta THEN
    RAISE NOTICE 'Using raw_user_meta_data column';
    EXECUTE $exec$
      INSERT INTO public.profiles (id, email, username, full_name)
      SELECT
        u.id,
        u.email,
        COALESCE((u.raw_user_meta_data::json->>'preferred_username'), (u.raw_user_meta_data::json->>'username'), NULL) AS username,
        COALESCE((u.raw_user_meta_data::json->>'full_name'), (u.raw_user_meta_data::json->>'fullName'), (u.raw_user_meta_data::json->>'name')) AS full_name
      FROM auth.users u
      WHERE u.email IS NOT NULL
      ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        username = CASE WHEN profiles.username IS NULL OR profiles.username = '' THEN EXCLUDED.username ELSE profiles.username END,
        full_name = CASE WHEN profiles.full_name IS NULL OR profiles.full_name = '' THEN EXCLUDED.full_name ELSE profiles.full_name END;
    $exec$;

  ELSE
    RAISE NOTICE 'No metadata column found on auth.users; inserting id/email only';
    EXECUTE $exec$
      INSERT INTO public.profiles (id, email)
      SELECT id, email FROM auth.users WHERE email IS NOT NULL
      ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;
    $exec$;
  END IF;
END$$;

-- End of script
