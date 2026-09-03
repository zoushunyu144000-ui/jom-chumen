import { getSql } from "@/lib/db";

let ready = false;

export async function ensureAppSchema() {
  if (ready) return;
  const sql = await getSql();
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
  await sql.query(`alter table events add column if not exists refund_hours int default 24`);
  await sql.query(`alter table events add column if not exists refund_fee_percent int default 50`);
  await sql.query(`alter table events add column if not exists gallery_count int default 0`);
  await sql.query(`alter table registrations add column if not exists refund_status text default ''`);
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
  ready = true;
}
