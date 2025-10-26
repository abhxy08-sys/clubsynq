-- Create memberships table to track which users have joined organizations
CREATE TABLE IF NOT EXISTS public.memberships (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  organization_id BIGINT NOT NULL,
  user_id UUID NOT NULL,
  joined_at TIMESTAMPTZ DEFAULT now(),
  role TEXT DEFAULT 'member' -- 'member' or 'admin'
);

-- Optional foreign keys
-- ALTER TABLE public.memberships
--   ADD CONSTRAINT memberships_org_fk FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

-- Grant basic permissions to authenticated
GRANT SELECT, INSERT, DELETE ON public.memberships TO authenticated;

-- NOTE: For RLS, create policies allowing users to insert/delete their own membership rows only.
