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
  await sql.query(`
    create table if not exists chats (
      id text primary key,
      club_id text,
      event_id text,
      title text not null default '',
      created_at timestamptz not null default now()
    )
  `);
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
