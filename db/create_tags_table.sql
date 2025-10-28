-- Create tags table used to define organization-level tags/roles
CREATE TABLE IF NOT EXISTS public.tags (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  organization_id BIGINT NOT NULL,
  name TEXT NOT NULL,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Ensure uniqueness of tag names per organization
CREATE UNIQUE INDEX IF NOT EXISTS tags_org_name_idx ON public.tags (organization_id, lower(name));

-- Grant basic permissions to authenticated role (adjust if using RLS)
GRANT SELECT, INSERT, UPDATE ON public.tags TO authenticated;

-- Optional RLS: allow authenticated users to read and allow org admins to manage
-- ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;

-- Notes:
-- 1) Run this in Supabase SQL editor as an admin to add the table.
-- 2) The client code will attempt to insert missing tags when an admin adds a member tag.
