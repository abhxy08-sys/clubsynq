-- Create table to store chat messages for groups created by admin
CREATE TABLE IF NOT EXISTS public.group_messages (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  group_id BIGINT NOT NULL REFERENCES public.target_groups(id) ON DELETE CASCADE,
  author_id UUID,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for quick retrieval per group
CREATE INDEX IF NOT EXISTS group_messages_group_idx ON public.group_messages (group_id, created_at DESC);

-- Grant basic permissions to authenticated role (adjust if using RLS)
GRANT SELECT, INSERT ON public.group_messages TO authenticated;

-- Optional RLS guidance:
-- ALTER TABLE public.group_messages ENABLE ROW LEVEL SECURITY;
-- Create policies to allow group members and org admins to read/insert.

-- Notes:
-- 1) Run this in Supabase SQL editor as an admin to add the table.
-- 2) Client code will attempt to read/insert messages; if RLS is enabled, add policies accordingly.
