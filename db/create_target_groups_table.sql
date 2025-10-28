-- Create target_groups and target_group_members to support named member groups
CREATE TABLE IF NOT EXISTS public.target_groups (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  organization_id BIGINT NOT NULL,
  name TEXT NOT NULL,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.target_group_members (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  group_id BIGINT NOT NULL,
  user_id UUID NOT NULL,
  added_by UUID,
  added_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_target_group_members_group_id ON public.target_group_members (group_id);
CREATE INDEX IF NOT EXISTS idx_target_group_members_user_id ON public.target_group_members (user_id);

-- Grant basic permissions to authenticated role (adjust if using RLS)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.target_groups TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.target_group_members TO authenticated;

-- Notes: Run this in Supabase SQL editor (admin) to add named groups for targeted posts.
