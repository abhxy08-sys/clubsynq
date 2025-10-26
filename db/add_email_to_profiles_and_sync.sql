-- add_email_to_profiles_and_sync.sql
-- Adds an `email` column to the `profiles` table if it doesn't exist, then copies emails from auth.users.
-- Run this in Supabase SQL editor (requires admin privileges / service_role).

BEGIN;

-- Add column if missing
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email text;

-- Populate email for profiles that are empty by joining auth.users
UPDATE profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id
  AND (p.email IS NULL OR p.email = '');

COMMIT;

-- Notes:
-- 1) This should be run as an admin (Supabase SQL editor or with service_role privileges).
-- 2) If you prefer, add a UNIQUE constraint or index on profiles.email depending on your requirements.
-- 3) For future signups, consider copying auth email into profiles on create via a server-side hook or a Postgres trigger.
