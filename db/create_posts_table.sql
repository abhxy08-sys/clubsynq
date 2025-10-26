-- create_posts_table.sql
-- Creates a posts table for organization announcements and polls
-- Columns:
-- id: primary key
-- organization_id: references organizations(id)
-- author_id: references auth.users (supabase auth) or stored as uuid/text
-- content: text
-- is_poll: boolean
-- options: jsonb (array of option strings) - used only when is_poll = true
-- metadata: jsonb - optional metadata
-- created_at, updated_at: timestamps

create table if not exists posts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  author_id uuid,
  content text,
  is_poll boolean default false,
  options jsonb,
  metadata jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- foreign key if organizations table exists
-- adjust column types if your organizations.id is not uuid
alter table if exists posts
  add constraint posts_organization_fk foreign key (organization_id) references organizations(id) on delete cascade;

-- index for queries by organization and created_at
create index if not exists posts_org_created_idx on posts (organization_id, created_at desc);

-- optional: if you use supabase auth, you can add a foreign key to auth.users
-- alter table posts add constraint posts_author_fk foreign key (author_id) references auth.users(id);

-- trigger to update updated_at
create or replace function posts_updated_at_trigger()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_posts_updated_at
  before update on posts
  for each row
  execute function posts_updated_at_trigger();
