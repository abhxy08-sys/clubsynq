-- Add homepage_color column to organizations for per-organization branding
-- Run this as an admin in Supabase SQL editor or via psql with a service role

ALTER TABLE IF EXISTS public.organizations
  ADD COLUMN IF NOT EXISTS homepage_color TEXT;

-- Optional: set a default for existing orgs (uncomment to apply)
-- UPDATE public.organizations SET homepage_color = '#2563eb' WHERE homepage_color IS NULL;

GRANT SELECT, UPDATE ON public.organizations TO authenticated;
