-- Create profiles table used by the Profile UI
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY,
  full_name TEXT,
  username TEXT,
  interests TEXT,
  skills TEXT,
  certifications TEXT,
  school TEXT,
  grade TEXT,
  bio TEXT,
  avatar_url TEXT,
  tags TEXT,
  updated_at timestamptz DEFAULT now()
);

-- Grant basic select/insert/update to authenticated role (optional if using RLS)
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;

-- Optional RLS: enable and add policy to allow users to manage only their own profile
-- ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
-- DROP POLICY IF EXISTS "Allow users to upsert their profile" ON public.profiles
-- CREATE POLICY "Allow users to upsert their profile" ON public.profiles
--   FOR ALL
--   TO authenticated
--   USING ( id = (auth.jwt() ->> 'sub')::uuid )
--   WITH CHECK ( id = (auth.jwt() ->> 'sub')::uuid );

-- Sample insert (replace id with an actual user UUID):
-- INSERT INTO public.profiles (id, full_name, username, interests) VALUES ('00000000-0000-0000-0000-000000000000', 'Test User', 'testuser', 'coding,design');
