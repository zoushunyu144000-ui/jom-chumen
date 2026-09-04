import { getSql } from "@/lib/db";
import { ensureAppSchema } from "@/lib/server/schema";

export async function isClubOwner(userId: string, clubId: string) {
  await ensureAppSchema();
  const sql = await getSql();
  const rows = await sql<{ id: string }>`
    select id from clubs where id = ${clubId} and user_id = ${userId} limit 1
  `;
  return Boolean(rows[0]);
}

export async function canManageClub(userId: string, clubId: string) {
  if (await isClubOwner(userId, clubId)) return true;
  const sql = await getSql();
  const rows = await sql<{ user_id: string }>`
    select user_id from club_members
    where club_id = ${clubId}
      and user_id = ${userId}
      and role in ('owner', 'admin')
    limit 1
  `;
  return Boolean(rows[0]);
}

export async function canManageEvent(userId: string, eventId: string) {
  await ensureAppSchema();
  const sql = await getSql();
  const rows = await sql<{ id: string }>`
    select e.id from events e
    where e.id = ${eventId}
      and (
        e.user_id = ${userId}
        or e.club_id in (select id from clubs where user_id = ${userId})
        or e.club_id in (
          select club_id from club_members
          where user_id = ${userId} and role in ('owner', 'admin')
        )
      )
    limit 1
  `;
  return Boolean(rows[0]);
}

export async function requireClubOwner(userId: string, clubId: string) {
  if (!(await isClubOwner(userId, clubId))) throw new Error("只有主人可以做这个");
}

export async function requireManageClub(userId: string, clubId: string) {
  if (!(await canManageClub(userId, clubId))) throw new Error("没有这个俱乐部的管理权限");
}

export async function requireManageEvent(userId: string, eventId: string) {
  if (!(await canManageEvent(userId, eventId))) throw new Error("没有这场活动的管理权限");
}
