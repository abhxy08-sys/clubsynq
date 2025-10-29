-- Add homepage_text_color column to organizations for per-organization branding
-- Run this as an admin in Supabase SQL editor or via psql with a service role

ALTER TABLE IF EXISTS public.organizations
  ADD COLUMN IF NOT EXISTS homepage_text_color TEXT;

-- Optional: set a default for existing orgs (uncomment to apply)
-- UPDATE public.organizations SET homepage_text_color = '#764E47' WHERE homepage_text_color IS NULL;

GRANT SELECT, UPDATE ON public.organizations TO authenticated;
