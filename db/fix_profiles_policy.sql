-- Fix for RLS policy type mismatch (text = uuid) when using auth.jwt() ->> 'sub'
-- Error: operator does not exist: text = uuid
-- Explanation: auth.jwt() ->> 'sub' returns text, but your table `profiles.id` is of type UUID.
-- You must cast one side so types match. Two options:
-- 1) cast JWT sub to UUID: (id = (auth.jwt() ->> 'sub')::uuid)
-- 2) cast id to text: (id::text = auth.jwt() ->> 'sub')

-- IMPORTANT: If you previously created a policy that compared auth.jwt() ->> 'sub' directly to id, drop it first.
-- Replace "Allow users to upsert their profile" with the corrected policy using casting.

-- Drop existing policy (if it exists)
DROP POLICY IF EXISTS "Allow users to upsert their profile" ON public.profiles;

-- Recreate policy using casting (preferred: cast JWT sub to UUID)
CREATE POLICY "Allow users to upsert their profile" ON public.profiles
  FOR ALL
  TO authenticated
  USING ( id = (auth.jwt() ->> 'sub')::uuid )
  WITH CHECK ( id = (auth.jwt() ->> 'sub')::uuid );

-- Alternative policy (if you prefer casting id to text instead):
-- DROP POLICY IF EXISTS "Allow users to upsert their profile" ON public.profiles;
-- CREATE POLICY "Allow users to upsert their profile_text_cast" ON public.profiles
--   FOR ALL
--   TO authenticated
--   USING ( id::text = auth.jwt() ->> 'sub' )
--   WITH CHECK ( id::text = auth.jwt() ->> 'sub' );

-- Notes:
-- - Run this in Supabase SQL editor. After running, test by using your app to update profile, or run a simple query as an authenticated user.
-- - If you used a different policy name or table name, adjust the DROP/CREATE statements accordingly.
-- - Similar casting may be needed in other policies where you compare JWT claims to UUID columns (e.g., memberships.user_id, user_points.user_id).
