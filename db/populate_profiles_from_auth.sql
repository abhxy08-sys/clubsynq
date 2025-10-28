-- Discovery: list columns on auth.users to identify metadata column name
-- Run this first in the Supabase SQL editor (requires admin privileges)
SELECT column_name
FROM information_schema.columns
WHERE table_schema = 'auth' AND table_name = 'users'
ORDER BY ordinal_position;

-- Migration: Upsert profiles from auth.users
-- Run this as an admin (Supabase SQL editor or using a service role key).
-- It attempts to extract username and full_name from either user_metadata (json) or raw_user_meta_data (text/json).
-- Review the SELECT first by running only the SELECT part below to preview extracted values.

-- Preview rows (run this to see what will be inserted/updated):
SELECT
  u.id,
  u.email,
  -- try common username keys
  COALESCE(u.user_metadata->>'preferred_username', u.user_metadata->>'username', u.user_metadata->>'preferred_username') AS extracted_username,
  -- try common name keys in user_metadata or raw_user_meta_data
  COALESCE(
    u.user_metadata->>'full_name',
    u.user_metadata->>'fullName',
    u.user_metadata->>'name',
    -- raw_user_meta_data may be text or json; try parsing if present
    (CASE WHEN u.raw_user_meta_data IS NOT NULL THEN (u.raw_user_meta_data::json->>'full_name') END),
    (CASE WHEN u.raw_user_meta_data IS NOT NULL THEN (u.raw_user_meta_data::json->>'name') END)
  ) AS extracted_full_name
FROM auth.users u
WHERE u.email IS NOT NULL
ORDER BY u.email
LIMIT 200;

-- Safe upsert: insert missing profiles or update empty name/username fields
-- IMPORTANT: run this as an admin. It will not overwrite existing non-empty full_name/username values.
INSERT INTO public.profiles (id, email, username, full_name)
SELECT
  u.id,
  u.email,
  COALESCE(u.user_metadata->>'preferred_username', u.user_metadata->>'username', NULL) AS username,
  COALESCE(
    u.user_metadata->>'full_name',
    u.user_metadata->>'fullName',
    u.user_metadata->>'name',
    (CASE WHEN u.raw_user_meta_data IS NOT NULL THEN (u.raw_user_meta_data::json->>'full_name') END),
    (CASE WHEN u.raw_user_meta_data IS NOT NULL THEN (u.raw_user_meta_data::json->>'name') END)
  ) AS full_name
FROM auth.users u
WHERE u.email IS NOT NULL
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  username = CASE WHEN profiles.username IS NULL OR profiles.username = '' THEN EXCLUDED.username ELSE profiles.username END,
  full_name = CASE WHEN profiles.full_name IS NULL OR profiles.full_name = '' THEN EXCLUDED.full_name ELSE profiles.full_name END;

/*
Notes & safety:
- This script should be run by a Supabase project admin (Service Role) via the SQL editor.
- It does not delete or overwrite existing non-empty profile.username/full_name values.
- If your project uses a different metadata column name (e.g., user_metadata vs raw_user_meta_data), the preview SELECT above will show extracted values so you can verify.
- If you have many users, remove the LIMIT in the preview and run the INSERT once you're satisfied.
*/
