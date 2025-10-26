-- create_post_votes_table.sql
-- Stores votes for poll posts
-- Columns:
-- id: primary key
-- post_id: references posts(id)
-- user_id: uuid - the voter
-- option_index: integer - index of the option in posts.options array
-- created_at: timestamptz

create table if not exists post_votes (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null,
  user_id uuid not null,
  option_index integer not null,
  created_at timestamptz default now()
);

alter table if exists post_votes
  add constraint post_votes_post_fk foreign key (post_id) references posts(id) on delete cascade;

-- prevent duplicate votes by the same user on the same post (if desired)
create unique index if not exists post_votes_unique_user_post on post_votes (post_id, user_id);

-- index to quickly aggregate counts
create index if not exists post_votes_post_idx on post_votes (post_id, option_index);
