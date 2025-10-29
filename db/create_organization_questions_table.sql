-- create_organization_questions_table.sql
-- Creates a table to store Q&A entries for organizations
-- Columns:
-- id: uuid primary key
-- organization_id: references organizations(id)
-- author_id: uuid of the user who asked (nullable for anonymous)
-- content: text question
-- answer: text answer (nullable)
-- answered_by: uuid of admin who answered (nullable)
-- created_at, answered_at: timestamps

create table if not exists organization_questions (
  id uuid primary key default gen_random_uuid(),
  -- organizations.id in this project is a bigint, so use bigint here for the FK
  organization_id bigint not null,
  -- auth.users.id is typically uuid in Supabase, keep these as uuid
  author_id uuid,
  -- parent_id allows threaded replies (self-referential)
  parent_id uuid,
  content text not null,
  answer text,
  answered_by uuid,
  created_at timestamptz default now(),
  answered_at timestamptz
);

alter table if exists organization_questions
  add constraint org_questions_organization_fk foreign key (organization_id) references organizations(id) on delete cascade;

-- self-referential FK so replies point to parent question (optional; comment out if RLS/policies prevent it)
alter table if exists organization_questions
  add constraint org_questions_parent_fk foreign key (parent_id) references organization_questions(id) on delete cascade;

create index if not exists org_questions_org_created_idx on organization_questions (organization_id, created_at desc);
create index if not exists org_questions_parent_idx on organization_questions (parent_id, created_at desc);

-- optional foreign key to auth.users for author/answered_by (commented out in case auth schema is restricted)
-- alter table organization_questions add constraint org_questions_author_fk foreign key (author_id) references auth.users(id);
-- alter table organization_questions add constraint org_questions_answered_by_fk foreign key (answered_by) references auth.users(id);

-- Grant minimal rights to authenticated role so client can insert/select/update rows (adjust as needed for your RLS policies)
grant select, insert, update on public.organization_questions to authenticated;
