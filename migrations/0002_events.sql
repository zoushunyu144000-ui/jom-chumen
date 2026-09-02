create table if not exists events (
  id text primary key,
  slug text unique not null,
  title text not null,
  subtitle text not null default '',
  category text not null,
  city text not null,
  venue text not null,
  address text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  currency text not null,
  price numeric not null,
  capacity integer not null,
  sold integer not null default 0,
  cover_url text not null,
  description text not null,
  highlights text not null default '[]',
  host_name text not null,
  host_note text not null default '',
  level text not null default 'all',
  created_at timestamptz not null default now()
);

create table if not exists registrations (
  id text primary key,
  event_id text not null references events(id),
  code text unique not null,
  nickname text not null,
  phone text not null,
  seats integer not null default 1,
  payment_method text not null,
  payment_status text not null default 'pending',
  amount numeric not null,
  currency text not null,
  created_at timestamptz not null default now()
);

create index if not exists registrations_event_id_idx on registrations (event_id);
create index if not exists registrations_code_idx on registrations (code);
