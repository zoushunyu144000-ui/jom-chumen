-- P0 ops: atomic apply numbers, verify tokens, club staff, chat read state, event lifecycle.

create table if not exists apply_counters (
  day text primary key,
  n int not null
);

create table if not exists club_members (
  club_id text not null,
  user_id text not null,
  role text not null default 'admin',
  created_at timestamptz not null default now(),
  primary key (club_id, user_id)
);

create table if not exists chats (
  id text primary key,
  title text not null default '',
  club_id text,
  event_id text,
  created_at timestamptz not null default now()
);

create table if not exists chat_members (
  chat_id text not null,
  user_id text not null,
  last_read_at timestamptz,
  primary key (chat_id, user_id)
);

create table if not exists chat_messages (
  id text primary key,
  chat_id text not null,
  user_id text not null,
  kind text not null default 'text',
  body text not null default '',
  file_name text not null default '',
  created_at timestamptz not null default now()
);

alter table clubs add column if not exists invite_code text;
alter table clubs add column if not exists avatar_url text not null default '';

alter table events add column if not exists refund_hours int default 24;
alter table events add column if not exists refund_fee_percent int default 50;
alter table events add column if not exists gallery_count int default 0;
alter table events add column if not exists status text not null default 'published';
alter table events add column if not exists cancelled_at timestamptz;
alter table events add column if not exists cancel_reason text not null default '';

alter table registrations add column if not exists refund_status text default '';
alter table registrations add column if not exists verify_token text;
alter table registrations add column if not exists cancelled_at timestamptz;
alter table registrations add column if not exists cancelled_by text;
alter table registrations add column if not exists cancel_reason text not null default '';
alter table registrations add column if not exists checked_in_at timestamptz;

alter table chat_members add column if not exists last_read_at timestamptz;

create unique index if not exists registrations_apply_no_idx on registrations (apply_no) where apply_no is not null;
create unique index if not exists registrations_verify_token_idx on registrations (verify_token) where verify_token is not null;

insert into club_members (club_id, user_id, role)
select id, user_id, 'owner' from clubs
on conflict do nothing;
