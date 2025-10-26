This folder contains SQL migrations used by the application.

Existing scripts:

New scripts in this folder:
- `sync_auth_emails_to_profiles.sql` — helper SQL to copy emails from `auth.users` into `profiles.email` for existing users. Run in Supabase SQL editor as an admin (service_role) to allow client-side autofill of certificate emails.
 - `add_email_to_profiles_and_sync.sql` — safe migration that adds `profiles.email` (if missing) and then syncs emails from `auth.users`. Run this first if your `profiles` table lacks an `email` column.

Sync Auth emails into profiles
--------------------------------
If your project's `profiles` table does not include user emails but the Auth panel does, the client cannot read `auth.users` for security reasons. Use `sync_auth_emails_to_profiles.sql` to copy emails into `profiles` so the frontend can autofill certificate emails.

Run the script in the Supabase SQL editor (or with a psql session using a DATABASE_URL that has admin privileges):

psql "$DATABASE_URL" -f sync_auth_emails_to_profiles.sql

Important: Run this as an admin (Supabase SQL editor or using service_role key). Do NOT expose service_role credentials to the browser.
How to run:

# Using psql (get your DATABASE_URL from Supabase dashboard)
psql "$DATABASE_URL" -f create_posts_table.sql
psql "$DATABASE_URL" -f create_post_votes_table.sql

# Or using the Supabase CLI:
supabase db remote set <database-url>
supabase db push

Notes:
- `posts.options` is stored as JSONB (array) to support poll options.
- `post_votes` includes a unique index to prevent duplicate votes by the same user on the same post. Remove that index if you want multiple votes per user.
- Adjust types/foreign keys if your `organizations.id` or auth user IDs have different types.
- If you use Row Level Security (RLS), ensure the authenticated role has appropriate policies for inserting into `posts` and `post_votes` or use the service_role to run migrations.

If you want, I can add SQL policy examples for RLS to allow authenticated users to create posts and cast votes, and to allow admins to manage posts.
