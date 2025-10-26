-- Create a simple user_points table to record points awarded to users
CREATE TABLE IF NOT EXISTS public.user_points (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL,
  organization_id BIGINT,
  points INTEGER NOT NULL DEFAULT 0,
  reason TEXT,
  awarded_by UUID,
  awarded_at TIMESTAMPTZ DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.user_points TO authenticated;

-- NOTE: Consider adding aggregated user totals or materialized views for leaderboards.
