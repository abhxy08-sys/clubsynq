-- sync_auth_emails_to_profiles.sql
-- Copies email addresses from auth.users into profiles.email for existing users where profiles.email is empty.
-- Run this in Supabase SQL editor (requires appropriate privileges). Prefer running from the SQL editor or with the service_role key.

-- NOTE: auth.users is protected for the anon/public role in many Supabase projects.
-- Run this as a trusted administrative user (Supabase SQL editor or via server using service_role key).

BEGIN;

-- 1) Update existing profiles that have no email
UPDATE profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id
  AND (p.email IS NULL OR p.email = '');

-- 2) Optional: insert minimal profiles for users who don't have a profiles record
-- Uncomment if you want to create profile rows for users missing them (careful: may create many rows).
-- INSERT INTO profiles (id, email, created_at)
-- SELECT u.id, u.email, now()
-- FROM auth.users u
-- LEFT JOIN profiles p ON p.id = u.id
-- WHERE p.id IS NULL;

COMMIT;

-- After running this, your client-side certificate autofill should find emails in profiles.
-- If you prefer on-signup syncing, implement a server-side webhook or use a Postgres function triggered by auth events (requires more setup).