create table if not exists profiles (
  user_id text primary key,
  display_name text not null default '',
  avatar_url text not null default '',
  tags text not null default '[]',
  updated_at timestamptz not null default now()
);

create table if not exists host_settings (
  user_id text primary key,
  whatsapp text not null default '',
  wechat_qr text not null default '',
  alipay_qr text not null default '',
  tng_qr text not null default ''
);

create table if not exists messages (
  id text primary key,
  user_id text not null,
  title text not null,
  body text not null default '',
  href text not null default '',
  read boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists messages_user_id_idx on messages (user_id, created_at desc);

alter table events add column if not exists open boolean not null default true;
alter table events add column if not exists whatsapp text not null default '';
alter table events add column if not exists wechat_qr text not null default '';
alter table events add column if not exists alipay_qr text not null default '';
alter table events add column if not exists tng_qr text not null default '';

alter table registrations add column if not exists apply_no text;
alter table registrations add column if not exists contact_wechat text not null default '';
alter table registrations add column if not exists contact_whatsapp text not null default '';
alter table registrations add column if not exists reject_reason text not null default '';
alter table registrations add column if not exists admin_note text not null default '';

create unique index if not exists registrations_apply_no_idx on registrations (apply_no) where apply_no is not null;
create index if not exists registrations_phone_event_idx on registrations (event_id, phone);
