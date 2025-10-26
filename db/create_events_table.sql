-- Migration: create events table
-- Run this SQL in Supabase SQL editor or via psql connected to your database.

-- 1) Create table
CREATE TABLE IF NOT EXISTS public.events (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  organization_id BIGINT NOT NULL,
  title TEXT NOT NULL,
  date DATE NOT NULL,
  description TEXT,
  created_by UUID,
  inserted_at TIMESTAMPTZ DEFAULT now()
);

-- 2) (Optional) Add a foreign key if your organizations.id is type bigint
-- ALTER TABLE public.events
--   ADD CONSTRAINT events_organization_fk FOREIGN KEY (organization_id) REFERENCES public.organizations (id) ON DELETE CASCADE;

-- 3) Grant minimal rights to authenticated role (simple approach)
GRANT SELECT, INSERT ON public.events TO authenticated;

-- 4) Optional: enable Row Level Security and policy to limit modifications
-- Use the SQL editor and adapt to your auth setup. Example approach below:

-- Enable RLS
-- ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Example policy: allow inserts for authenticated users
-- CREATE POLICY "Allow authenticated insert" ON public.events
--   FOR INSERT
--   TO authenticated
--   USING (true);

-- If you want a stricter policy that only allows organization admin to insert, you'll need a way to map the authenticated user's identity (user id or email) to organization.admin_email or a membership table.
-- Example (conceptual):
-- CREATE POLICY "Org admin can insert" ON public.events
--   FOR INSERT
--   TO authenticated
--   WITH CHECK (
--     (SELECT admin_email FROM public.organizations WHERE organizations.id = organization_id) = auth.jwt() ->> 'email'
--   );

-- 5) Sample insert (adjust organization_id to a real org id):
-- INSERT INTO public.events (organization_id, title, date, description) VALUES (1, 'Sample event', '2025-10-15', 'Test event');
