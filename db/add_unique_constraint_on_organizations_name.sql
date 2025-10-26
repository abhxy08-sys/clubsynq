-- add_unique_constraint_on_organizations_name.sql
-- Ensures organization names are unique (case-insensitive) by creating a unique index on lower(name).
-- Run this in Supabase SQL editor as an admin. If duplicates exist the index creation will fail; review duplicates first.

-- Check for duplicates (run this first to see if you need to clean up):
-- SELECT lower(name) AS name_lower, count(*) FROM organizations GROUP BY lower(name) HAVING count(*) > 1;

-- If no duplicates, create a unique index (case-insensitive):
CREATE UNIQUE INDEX IF NOT EXISTS organizations_name_unique ON organizations (LOWER(name));

-- Note: If this fails due to duplicates, resolve them in your DB before re-running this migration.
-- You can delete or rename duplicate rows, or merge related organizations as appropriate.
