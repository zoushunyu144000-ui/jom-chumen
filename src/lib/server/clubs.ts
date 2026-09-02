import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import { currencyForCity } from "@/lib/catalog";
import { makeId } from "@/lib/utils";
import { ensureSeeded, eventSelect, mapEvent, type EventRow } from "@/lib/server/events";
import type { BodyBlock, ClubRecord, Currency } from "@/lib/types";

type ClubRow = {
  id: string;
  user_id: string;
  name: string;
  bio: string;
  city: string;
  cover_url: string;
  event_count: number | string | null;
};

function mapClub(row: ClubRow, userId?: string): ClubRecord {
  return {
    id: row.id,
    name: row.name,
    bio: row.bio,
    city: row.city as ClubRecord["city"],
    coverUrl: row.cover_url,
    hostName: row.name,
    eventCount: Number(row.event_count) || 0,
    isOwner: Boolean(userId && row.user_id === userId),
  };
}

const clubSelect = `
  select c.*, coalesce(e.n, 0) as event_count
  from clubs c
  left join (
    select club_id, count(*)::int as n from events where club_id is not null group by club_id
  ) e on e.club_id = c.id
`;

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
    const sql = await getSql();
    const rows = await sql.query<ClubRow>(
      `${clubSelect} where c.id = $1 limit 1`,
      [data.id],
    );
    if (!rows[0]) return null;
    return mapClub(rows[0]);
  });

export const getMyClub = createServerFn({ method: "GET" })
  .validator((data: unknown) => z.object({ id: z.string().min(1) }).parse(data))
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const rows = await sql.query<ClubRow>(
      `${clubSelect} where c.id = $1 and c.user_id = $2 limit 1`,
      [data.id, context.userId],
    );
    return rows[0] ? mapClub(rows[0], context.userId) : null;
  });

export const listMyClubs = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    await ensureSeeded();
    const sql = await getSql();
    const rows = await sql.query<ClubRow>(
      `${clubSelect} where c.user_id = $1 order by c.created_at desc`,
      [context.userId],
    );
    return rows.map((row) => mapClub(row, context.userId));
  });

export const listMyEvents = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    await ensureSeeded();
    const sql = await getSql();
    const rows = await sql.query<EventRow>(
      `${eventSelect} where e.user_id = $1 order by e.starts_at desc`,
      [context.userId],
    );
    return rows.map(mapEvent);
  });

const createClubSchema = z.object({
  name: z.string().trim().min(2).max(24),
  bio: z.string().trim().max(200).default(""),
  city: z.enum(["penang", "kl", "jb", "singapore", "bangkok"]),
  coverUrl: z.string().max(1_500_000).default(""),
});

export const createClub = createServerFn({ method: "POST" })
  .validator((data: unknown) => createClubSchema.parse(data))
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    assertImage(data.coverUrl);
    const sql = await getSql();
    const id = makeId("club");
    await sql`
      insert into clubs (id, user_id, name, bio, city, cover_url)
      values (${id}, ${context.userId}, ${data.name}, ${data.bio}, ${data.city}, ${data.coverUrl})
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
    const sql = await getSql();
    const clubs = await sql<{ id: string; name: string }>`
      select id, name from clubs where id = ${data.clubId} and user_id = ${context.userId} limit 1
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
        user_id, club_id, body, open, whatsapp, wechat_qr, alipay_qr, tng_qr
      ) values (
        ${id}, ${slug}, ${data.title}, ${data.subtitle}, ${data.category},
        ${data.city}, ${data.venue}, ${data.address}, ${lat}, ${lng},
        ${starts.toISOString()}, ${ends.toISOString()}, ${currency},
        ${data.price}, ${data.capacity}, ${0}, ${data.coverUrl},
        ${description}, ${JSON.stringify(data.highlights)}, ${clubs[0].name},
        ${data.hostNote}, ${data.level}, ${context.userId}, ${data.clubId},
        ${JSON.stringify(body)}, ${true}, ${whatsapp}, ${wechatQr}, ${alipayQr}, ${tngQr}
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
    const sql = await getSql();
    const owned = await sql<{ id: string }>`
      select id from clubs where id = ${data.id} and user_id = ${context.userId} limit 1
    `;
    if (!owned[0]) throw new Error("没有这个俱乐部");
    await sql`
      update clubs
      set name = ${data.name}, bio = ${data.bio}, city = ${data.city}, cover_url = ${data.coverUrl}
      where id = ${data.id} and user_id = ${context.userId}
    `;
    await sql`
      update events set host_name = ${data.name}
      where club_id = ${data.id} and user_id = ${context.userId}
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
      where e.id = ${data.eventId} and e.user_id = ${context.userId}
      limit 1
    `;
    if (!owned[0]) throw new Error("没有这场活动");
    if (data.capacity < owned[0].booked) {
      throw new Error(`人数上限不能小于已录取的 ${owned[0].booked} 人`);
    }
    const clubs = await sql<{ id: string; name: string }>`
      select id, name from clubs where id = ${data.clubId} and user_id = ${context.userId} limit 1
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
      where id = ${data.eventId} and user_id = ${context.userId}
    `;
    return { id: data.eventId };
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
