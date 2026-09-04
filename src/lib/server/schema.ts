import { getSql } from "@/lib/db";

let ready = false;

export async function ensureAppSchema() {
  if (ready) return;
  const sql = await getSql();
  await sql.query(`
    create table if not exists apply_counters (
      day text primary key,
      n int not null
    )
  `);
  await sql.query(`
    create table if not exists club_members (
      club_id text not null,
      user_id text not null,
      role text not null default 'admin',
      created_at timestamptz not null default now(),
      primary key (club_id, user_id)
    )
  `);
  await sql.query(`alter table clubs add column if not exists invite_code text`);
  await sql.query(`alter table clubs add column if not exists avatar_url text not null default ''`);
  await sql.query(`alter table events add column if not exists refund_hours int default 24`);
  await sql.query(`alter table events add column if not exists refund_fee_percent int default 50`);
  await sql.query(`alter table events add column if not exists gallery_count int default 0`);
  await sql.query(`alter table events add column if not exists status text not null default 'published'`);
  await sql.query(`alter table events add column if not exists cancelled_at timestamptz`);
  await sql.query(`alter table events add column if not exists cancel_reason text not null default ''`);
  await sql.query(`alter table registrations add column if not exists refund_status text default ''`);
  await sql.query(`alter table registrations add column if not exists verify_token text`);
  await sql.query(`alter table registrations add column if not exists cancelled_at timestamptz`);
  await sql.query(`alter table registrations add column if not exists cancelled_by text`);
  await sql.query(`alter table registrations add column if not exists cancel_reason text not null default ''`);
  await sql.query(`alter table registrations add column if not exists checked_in_at timestamptz`);
  try {
    await sql.query(`alter table profiles add column if not exists gender text default ''`);
  } catch {
    /* profiles may not exist yet */
  }
  await sql.query(`
    create table if not exists chats (
      id text primary key,
      title text not null default '',
      created_at timestamptz not null default now()
    )
  `);
  await sql.query(`alter table chats add column if not exists club_id text`);
  await sql.query(`alter table chats add column if not exists event_id text`);
  await sql.query(`
    create table if not exists chat_members (
      chat_id text not null,
      user_id text not null,
      primary key (chat_id, user_id)
    )
  `);
  await sql.query(`alter table chat_members add column if not exists last_read_at timestamptz`);
  await sql.query(`
    create table if not exists chat_messages (
      id text primary key,
      chat_id text not null,
      user_id text not null,
      kind text not null default 'text',
      body text not null default '',
      file_name text not null default '',
      created_at timestamptz not null default now()
    )
  `);
  await sql.query(`alter table chat_messages add column if not exists reply_to_id text`);
  await sql.query(`alter table chat_messages add column if not exists edited_at timestamptz`);
  try {
    await sql.query(
      `create unique index if not exists registrations_apply_no_idx on registrations (apply_no) where apply_no is not null`,
    );
    await sql.query(
      `create unique index if not exists registrations_verify_token_idx on registrations (verify_token) where verify_token is not null`,
    );
  } catch {
    /* index may already exist with another name */
  }
  try {
    await sql.query(`
      insert into club_members (club_id, user_id, role)
      select id, user_id, 'owner' from clubs
      on conflict do nothing
    `);
  } catch {
    /* clubs may not exist yet */
  }
  ready = true;
}
