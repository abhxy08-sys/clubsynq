-- Add admins column to organizations to support multiple admins (emails)
-- Run as an admin in Supabase SQL editor

ALTER TABLE IF EXISTS public.organizations
  ADD COLUMN IF NOT EXISTS admins text[] DEFAULT ARRAY[]::text[];

GRANT SELECT, UPDATE ON public.organizations TO authenticated;
