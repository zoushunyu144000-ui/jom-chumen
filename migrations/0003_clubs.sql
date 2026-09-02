create table if not exists clubs (
  id text primary key,
  user_id text not null,
  name text not null,
  bio text not null default '',
  city text not null,
  cover_url text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists clubs_user_id_idx on clubs (user_id);

alter table events add column if not exists user_id text;
alter table events add column if not exists club_id text;
alter table events add column if not exists body text not null default '[]';

alter table registrations add column if not exists user_id text;

create index if not exists events_user_id_idx on events (user_id);
create index if not exists events_club_id_idx on events (club_id);
create index if not exists clubs_city_idx on clubs (city);
