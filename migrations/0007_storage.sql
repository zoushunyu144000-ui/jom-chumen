create table if not exists media_objects (
  id text primary key,
  user_id text not null,
  object_key text not null unique,
  url text not null,
  file_name text not null default '',
  mime_type text not null,
  file_size bigint not null,
  kind text not null default 'upload',
  created_at timestamptz not null default now()
);

create index if not exists media_objects_user_created_idx
  on media_objects (user_id, created_at desc);
