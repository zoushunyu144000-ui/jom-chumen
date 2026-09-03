import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import { ensureAppSchema } from "@/lib/server/schema";

function shortAvatar(src?: string | null) {
  if (!src) return "";
  if (src.startsWith("data:")) return "";
  return src;
}

export type Attendee = {
  userId: string | null;
  name: string;
  avatarUrl: string;
  gender: string;
};

export const listEventAttendees = createServerFn({ method: "GET" })
  .validator((data: unknown) => z.object({ slug: z.string().min(1) }).parse(data))
  .handler(async ({ data }): Promise<Attendee[]> => {
    await ensureAppSchema();
    const sql = await getSql();
    const rows = await sql<{
      user_id: string | null;
      nickname: string;
      display_name: string | null;
      user_name: string | null;
      avatar_url: string | null;
      user_image: string | null;
      gender: string | null;
    }>`
      select r.user_id, r.nickname,
        p.display_name, u.name as user_name,
        p.avatar_url, u.image as user_image,
        coalesce(p.gender, '') as gender
      from registrations r
      join events e on e.id = r.event_id
      left join profiles p on p.user_id = r.user_id
      left join "user" u on u.id = r.user_id
      where e.slug = ${data.slug}
        and r.payment_status in ('approved', 'paid')
      order by r.created_at asc
      limit 40
    `;
    return rows.map((row) => ({
      userId: row.user_id,
      name: row.display_name || row.user_name || row.nickname,
      avatarUrl: shortAvatar(row.avatar_url) || shortAvatar(row.user_image),
      gender: row.gender || "",
    }));
  });

export const getPublicPerson = createServerFn({ method: "GET" })
  .validator((data: unknown) => z.object({ userId: z.string().min(1) }).parse(data))
  .handler(async ({ data }) => {
    await ensureAppSchema();
    const sql = await getSql();
    const rows = await sql<{
      display_name: string | null;
      avatar_url: string | null;
      tags: string | null;
      gender: string | null;
      user_name: string | null;
      user_image: string | null;
    }>`
      select p.display_name, p.avatar_url, p.tags, p.gender, u.name as user_name, u.image as user_image
      from "user" u
      left join profiles p on p.user_id = u.id
      where u.id = ${data.userId}
      limit 1
    `;
    const row = rows[0];
    if (!row) return null;
    let tags: string[] = [];
    try {
      const parsed = JSON.parse(row.tags || "[]") as unknown;
      if (Array.isArray(parsed)) tags = parsed.map(String).slice(0, 8);
    } catch {
      tags = [];
    }
    const events = await sql<{ slug: string; title: string; starts_at: string | Date }>`
      select e.slug, e.title, e.starts_at
      from registrations r
      join events e on e.id = r.event_id
      where r.user_id = ${data.userId}
        and r.payment_status in ('approved', 'paid')
      order by e.starts_at desc
      limit 12
    `;
    return {
      id: data.userId,
      name: row.display_name || row.user_name || "出门的人",
      avatarUrl: shortAvatar(row.avatar_url) || shortAvatar(row.user_image),
      gender: row.gender || "",
      tags,
      events: events.map((item) => ({
        slug: item.slug,
        title: item.title,
        startsAt: new Date(item.starts_at).toISOString(),
      })),
    };
  });

export const openUserChat = createServerFn({ method: "POST" })
  .validator((data: unknown) => z.object({ userId: z.string().min(1) }).parse(data))
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    if (data.userId === context.userId) throw new Error("不能给自己发私信");
    await ensureAppSchema();
    const sql = await getSql();
    const other = await sql<{ name: string | null }>`select name from "user" where id = ${data.userId} limit 1`;
    if (!other[0]) throw new Error("找不到这个人");
    const pair = [context.userId, data.userId].sort();
    const id = `chat_dm_${pair[0]}_${pair[1]}`;
    const titleRow = await sql<{ display_name: string | null }>`select display_name from profiles where user_id = ${data.userId} limit 1`;
    const title = titleRow[0]?.display_name || other[0].name || "私信";
    await sql`insert into chats (id, title) values (${id}, ${title}) on conflict (id) do nothing`;
    await sql`insert into chat_members (chat_id, user_id) values (${id}, ${context.userId}) on conflict do nothing`;
    await sql`insert into chat_members (chat_id, user_id) values (${id}, ${data.userId}) on conflict do nothing`;
    return { id, title };
  });
