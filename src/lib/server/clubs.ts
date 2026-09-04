import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import { currencyForCity } from "@/lib/catalog";
import { canManageClub, canManageEvent, requireClubOwner, requireManageClub } from "@/lib/server/access";
import { ensureAppSchema } from "@/lib/server/schema";
import { makeId } from "@/lib/utils";
import { ensureSeeded, eventSelect, mapEvent, type EventRow } from "@/lib/server/events";
import type { BodyBlock, ClubRecord, ClubStaff, Currency } from "@/lib/types";

type ClubRow = {
  id: string;
  user_id: string;
  name: string;
  bio: string;
  city: string;
  cover_url: string;
  avatar_url?: string | null;
  event_count: number | string | null;
};

function shortAvatar(src?: string | null) {
  if (!src || src.startsWith("data:")) return "";
  return src;
}

function mapClub(row: ClubRow, userId?: string, extra?: { isAdmin?: boolean; staff?: ClubStaff[] }): ClubRecord {
  return {
    id: row.id,
    name: row.name,
    bio: row.bio,
    city: row.city as ClubRecord["city"],
    coverUrl: row.cover_url,
    avatarUrl: row.avatar_url || "",
    hostName: row.name,
    eventCount: Number(row.event_count) || 0,
    isOwner: Boolean(userId && row.user_id === userId),
    isAdmin: Boolean(extra?.isAdmin || (userId && row.user_id === userId)),
    staff: extra?.staff ?? [],
  };
}

const clubSelect = `
  select c.*, coalesce(e.n, 0) as event_count
  from clubs c
  left join (
    select club_id, count(*)::int as n from events where club_id is not null group by club_id
  ) e on e.club_id = c.id
`;

async function loadStaff(clubId: string, ownerId: string): Promise<ClubStaff[]> {
  const sql = await getSql();
  const rows = await sql<{
    user_id: string;
    role: string;
    display_name: string | null;
    user_name: string | null;
    avatar_url: string | null;
    user_image: string | null;
  }>`
    select m.user_id, m.role, p.display_name, u.name as user_name,
           p.avatar_url, u.image as user_image
    from club_members m
    left join profiles p on p.user_id = m.user_id
    left join "user" u on u.id = m.user_id
    where m.club_id = ${clubId}
  `;
  const map = new Map<string, ClubStaff>();
  const ownerRow = rows.find((row) => row.user_id === ownerId);
  const ownerName = ownerRow?.display_name || ownerRow?.user_name || "主人";
  map.set(ownerId, {
    userId: ownerId,
    name: ownerName,
    avatarUrl: shortAvatar(ownerRow?.avatar_url) || shortAvatar(ownerRow?.user_image),
    role: "owner",
  });
  for (const row of rows) {
    if (row.user_id === ownerId) continue;
    map.set(row.user_id, {
      userId: row.user_id,
      name: row.display_name || row.user_name || "主理人",
      avatarUrl: shortAvatar(row.avatar_url) || shortAvatar(row.user_image),
      role: "admin",
    });
  }
  if (!ownerRow) {
    const owner = await sql<{ name: string | null; image: string | null; display_name: string | null }>`
      select u.name, u.image, p.display_name
      from "user" u
      left join profiles p on p.user_id = u.id
      where u.id = ${ownerId} limit 1
    `;
    if (owner[0]) {
      map.set(ownerId, {
        userId: ownerId,
        name: owner[0].display_name || owner[0].name || "主人",
        avatarUrl: shortAvatar(owner[0].image),
        role: "owner",
      });
    }
  }
  return [...map.values()];
}

export const listClubs = createServerFn({ method: "GET" })
  .validator((data: unknown) =>
    z.object({ city: z.string().optional() }).parse(data ?? {}),
  )
  .handler(async ({ data }) => {
    await ensureSeeded();
    const sql = await getSql();
    const rows = await sql.query<ClubRow>(
      `${clubSelect} order by c.created_at desc`,
    );
    return rows
      .map((row) => mapClub(row))
      .filter((club) =>
        !data.city || data.city === "all" ? true : club.city === data.city,
      );
  });

export const getClub = createServerFn({ method: "GET" })
  .validator((data: unknown) => z.object({ id: z.string().min(1) }).parse(data))
  .handler(async ({ data }) => {
    await ensureAppSchema();
    const sql = await getSql();
    const rows = await sql.query<ClubRow>(
      `${clubSelect} where c.id = $1 limit 1`,
      [data.id],
    );
    if (!rows[0]) return null;
    const staff = await loadStaff(rows[0].id, rows[0].user_id).catch(() => []);
    return mapClub(rows[0], undefined, { staff });
  });

export const getMyClub = createServerFn({ method: "GET" })
  .validator((data: unknown) => z.object({ id: z.string().min(1) }).parse(data))
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    await ensureAppSchema();
    if (!(await canManageClub(context.userId, data.id))) return null;
    const sql = await getSql();
    const rows = await sql.query<ClubRow>(
      `${clubSelect} where c.id = $1 limit 1`,
      [data.id],
    );
    if (!rows[0]) return null;
    const staff = await loadStaff(rows[0].id, rows[0].user_id).catch(() => []);
    return mapClub(rows[0], context.userId, { isAdmin: true, staff });
  });

export const listMyClubs = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    await ensureSeeded();
    await ensureAppSchema();
    const sql = await getSql();
    const rows = await sql.query<ClubRow>(
      `${clubSelect}
       where c.user_id = $1
          or c.id in (select club_id from club_members where user_id = $1)
       order by c.created_at desc`,
      [context.userId],
    );
    return rows.map((row) => mapClub(row, context.userId, { isAdmin: true }));
  });

export const listMyEvents = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    await ensureSeeded();
    await ensureAppSchema();
    const sql = await getSql();
    const rows = await sql.query<EventRow>(
      `${eventSelect}
       where e.user_id = $1
          or e.club_id in (select id from clubs where user_id = $1)
          or e.club_id in (select club_id from club_members where user_id = $1)
       order by e.starts_at desc`,
      [context.userId],
    );
    return rows.map(mapEvent);
  });

const createClubSchema = z.object({
  name: z.string().trim().min(2).max(24),
  bio: z.string().trim().max(200).default(""),
  city: z.enum(["penang", "kl", "jb", "singapore", "bangkok"]),
  coverUrl: z.string().max(1_500_000).default(""),
  avatarUrl: z.string().max(1_500_000).default(""),
});

export const createClub = createServerFn({ method: "POST" })
  .validator((data: unknown) => createClubSchema.parse(data))
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    assertImage(data.coverUrl);
    assertImage(data.avatarUrl);
    await ensureAppSchema();
    const sql = await getSql();
    const id = makeId("club");
    await sql`
      insert into clubs (id, user_id, name, bio, city, cover_url, avatar_url)
      values (${id}, ${context.userId}, ${data.name}, ${data.bio}, ${data.city}, ${data.coverUrl}, ${data.avatarUrl})
    `;
    await sql`
      insert into club_members (club_id, user_id, role)
      values (${id}, ${context.userId}, ${"owner"})
      on conflict do nothing
    `;
    return { id };
  });

const blockSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("h"), text: z.string().max(80) }),
  z.object({ type: z.literal("p"), text: z.string().max(2000) }),
  z.object({ type: z.literal("quote"), text: z.string().max(500) }),
  z.object({
    type: z.literal("ul"),
    items: z.array(z.string().max(120)).max(12),
  }),
  z.object({
    type: z.literal("img"),
    src: z.string().max(1_500_000),
    caption: z.string().max(80).default(""),
  }),
]);

const createEventSchema = z.object({
  clubId: z.string().min(1),
  title: z.string().trim().min(2).max(40),
  subtitle: z.string().trim().max(60).default(""),
  category: z.enum([
    "frisbee",
    "photo",
    "hike",
    "reading",
    "citywalk",
    "water",
    "racket",
    "camp",
    "talk",
    "yoga",
  ]),
  city: z.enum(["penang", "kl", "jb", "singapore", "bangkok"]),
  venue: z.string().trim().min(2).max(80),
  address: z.string().trim().min(2).max(200),
  lat: z.number().min(-90).max(90).nullable().optional(),
  lng: z.number().min(-180).max(180).nullable().optional(),
  startsAt: z.string().min(1),
  endsAt: z.string().min(1),
  price: z.number().min(0).max(9999),
  capacity: z.number().int().min(2).max(200),
  coverUrl: z.string().min(8).max(1_500_000),
  description: z.string().trim().max(2000).default(""),
  highlights: z.array(z.string().max(80)).max(8).default([]),
  hostNote: z.string().trim().max(80).default(""),
  level: z.enum(["newbie", "all", "intermediate"]).default("all"),
  body: z.array(blockSchema).max(24).default([]),
});

export const createEvent = createServerFn({ method: "POST" })
  .validator((data: unknown) => createEventSchema.parse(data))
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    assertImage(data.coverUrl);
    const imageCount = data.body.filter((block) => block.type === "img").length;
    if (imageCount > 6) throw new Error("详情图片最多 6 张");
    for (const block of data.body) {
      if (block.type === "img") assertImage(block.src);
    }
    await requireManageClub(context.userId, data.clubId);
    const sql = await getSql();
    const clubs = await sql<{ id: string; name: string }>`
      select id, name from clubs where id = ${data.clubId} limit 1
    `;
    if (!clubs[0]) throw new Error("俱乐部不存在");

    const starts = new Date(data.startsAt);
    const ends = new Date(data.endsAt);
    if (Number.isNaN(starts.getTime()) || Number.isNaN(ends.getTime())) {
      throw new Error("时间不正确");
    }
    if (ends <= starts) throw new Error("结束时间要晚于开始");

    const id = makeId("evt");
    const slug = `${id.replace("evt_", "j-")}`;
    const currency: Currency = currencyForCity(data.city);
    const body = data.body as BodyBlock[];
    const firstPara = body.find(
      (block): block is Extract<BodyBlock, { type: "p" }> =>
        block.type === "p" && Boolean(block.text.trim()),
    );
    const description =
      data.description.trim() || firstPara?.text || data.subtitle || data.title;

    const settings = await sql<{
      whatsapp: string;
      wechat_qr: string;
      alipay_qr: string;
      tng_qr: string;
    }>`select * from host_settings where user_id = ${context.userId} limit 1`;
    const host = settings[0];
    const whatsapp = host?.whatsapp || "601135550088";
    const wechatQr = host?.wechat_qr || "/pay/wechat.svg";
    const alipayQr = host?.alipay_qr || "/pay/alipay.svg";
    const tngQr = host?.tng_qr || "/pay/tng.svg";

    const lat = data.lat ?? null;
    const lng = data.lng ?? null;
    await sql`
      insert into events (
        id, slug, title, subtitle, category, city, venue, address, lat, lng,
        starts_at, ends_at, currency, price, capacity, sold, cover_url,
        description, highlights, host_name, host_note, level,
        user_id, club_id, body, open, status, whatsapp, wechat_qr, alipay_qr, tng_qr
      ) values (
        ${id}, ${slug}, ${data.title}, ${data.subtitle}, ${data.category},
        ${data.city}, ${data.venue}, ${data.address}, ${lat}, ${lng},
        ${starts.toISOString()}, ${ends.toISOString()}, ${currency},
        ${data.price}, ${data.capacity}, ${0}, ${data.coverUrl},
        ${description}, ${JSON.stringify(data.highlights)}, ${clubs[0].name},
        ${data.hostNote}, ${data.level}, ${context.userId}, ${data.clubId},
        ${JSON.stringify(body)}, ${true}, ${"published"}, ${whatsapp}, ${wechatQr}, ${alipayQr}, ${tngQr}
      )
    `;
    return { id, slug };
  });

export const updateClub = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    createClubSchema.extend({ id: z.string().min(1) }).parse(data),
  )
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    assertImage(data.coverUrl);
    assertImage(data.avatarUrl);
    await requireManageClub(context.userId, data.id);
    const sql = await getSql();
    const replaceAvatar = !data.avatarUrl || data.avatarUrl.startsWith("data:image") || data.avatarUrl.startsWith("http") || data.avatarUrl.startsWith("/");
    await sql`
      update clubs
      set name = ${data.name}, bio = ${data.bio}, city = ${data.city}, cover_url = ${data.coverUrl},
          avatar_url = case when ${replaceAvatar && Boolean(data.avatarUrl)} then ${data.avatarUrl} else avatar_url end
      where id = ${data.id}
    `;
    await sql`
      update events set host_name = ${data.name}
      where club_id = ${data.id}
    `;
    return { id: data.id };
  });

export const updateEvent = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    createEventSchema.extend({ eventId: z.string().min(1) }).parse(data),
  )
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    assertImage(data.coverUrl);
    const imageCount = data.body.filter((block) => block.type === "img").length;
    if (imageCount > 6) throw new Error("详情图片最多 6 张");
    for (const block of data.body) {
      if (block.type === "img") assertImage(block.src);
    }
    if (!(await canManageEvent(context.userId, data.eventId))) throw new Error("没有这场活动");
    await requireManageClub(context.userId, data.clubId);
    const sql = await getSql();
    const owned = await sql<{ id: string; booked: number }>`
      select e.id, coalesce(r.paid_seats, 0)::int as booked
      from events e
      left join (
        select event_id, sum(seats)::int as paid_seats
        from registrations
        where payment_status in ('approved', 'paid')
        group by event_id
      ) r on r.event_id = e.id
      where e.id = ${data.eventId}
      limit 1
    `;
    if (!owned[0]) throw new Error("没有这场活动");
    if (data.capacity < owned[0].booked) {
      throw new Error(`人数上限不能小于已录取的 ${owned[0].booked} 人`);
    }
    const clubs = await sql<{ id: string; name: string }>`
      select id, name from clubs where id = ${data.clubId} limit 1
    `;
    if (!clubs[0]) throw new Error("俱乐部不存在");
    const starts = new Date(data.startsAt);
    const ends = new Date(data.endsAt);
    if (Number.isNaN(starts.getTime()) || Number.isNaN(ends.getTime())) {
      throw new Error("时间不正确");
    }
    if (ends <= starts) throw new Error("结束时间要晚于开始");
    const currency: Currency = currencyForCity(data.city);
    const body = data.body as BodyBlock[];
    const firstPara = body.find(
      (block): block is Extract<BodyBlock, { type: "p" }> =>
        block.type === "p" && Boolean(block.text.trim()),
    );
    const description =
      data.description.trim() || firstPara?.text || data.subtitle || data.title;
    await sql`
      update events set
        title = ${data.title},
        subtitle = ${data.subtitle},
        category = ${data.category},
        city = ${data.city},
        venue = ${data.venue},
        address = ${data.address},
        lat = ${data.lat ?? null},
        lng = ${data.lng ?? null},
        starts_at = ${starts.toISOString()},
        ends_at = ${ends.toISOString()},
        currency = ${currency},
        price = ${data.price},
        capacity = ${data.capacity},
        cover_url = ${data.coverUrl},
        description = ${description},
        highlights = ${JSON.stringify(data.highlights)},
        host_name = ${clubs[0].name},
        host_note = ${data.hostNote},
        level = ${data.level},
        club_id = ${data.clubId},
        body = ${JSON.stringify(body)}
      where id = ${data.eventId}
    `;
    return { id: data.eventId };
  });

export const removeClubAdmin = createServerFn({ method: "POST" })
  .validator((data: unknown) => z.object({ clubId: z.string().min(1), userId: z.string().min(1) }).parse(data))
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    await requireClubOwner(context.userId, data.clubId);
    if (data.userId === context.userId) throw new Error("不能移除主人");
    const sql = await getSql();
    const owner = await sql<{ user_id: string }>`select user_id from clubs where id = ${data.clubId} limit 1`;
    if (owner[0]?.user_id === data.userId) throw new Error("不能移除主人");
    await sql`delete from club_members where club_id = ${data.clubId} and user_id = ${data.userId}`;
  });

export const transferClubOwner = createServerFn({ method: "POST" })
  .validator((data: unknown) => z.object({ clubId: z.string().min(1), userId: z.string().min(1) }).parse(data))
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    await requireClubOwner(context.userId, data.clubId);
    if (data.userId === context.userId) throw new Error("已经是主人");
    const sql = await getSql();
    const member = await sql<{ user_id: string }>`
      select user_id from club_members where club_id = ${data.clubId} and user_id = ${data.userId} limit 1
    `;
    if (!member[0]) throw new Error("只能转给现有主理人");
    const moved = await sql<{ club_id: string }>`
      with moved as (
        update clubs set user_id = ${data.userId}
        where id = ${data.clubId} and user_id = ${context.userId}
        returning id
      ), demote as (
        update club_members set role = 'admin'
        where club_id = ${data.clubId} and user_id = ${context.userId}
          and exists (select 1 from moved)
        returning user_id
      )
      insert into club_members (club_id, user_id, role)
      select ${data.clubId}, ${data.userId}, ${"owner"} from moved
      on conflict (club_id, user_id) do update set role = 'owner'
      returning club_id
    `;
    if (!moved[0]) throw new Error("转让失败");
  });

function assertImage(src: string) {
  if (!src) return;
  const ok =
    src.startsWith("data:image/jpeg") ||
    src.startsWith("data:image/png") ||
    src.startsWith("data:image/webp") ||
    src.startsWith("/covers/") ||
    src.startsWith("https://");
  if (!ok) throw new Error("图片格式不支持");
}
