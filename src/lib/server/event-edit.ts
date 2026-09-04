import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import { requireManageClub, requireManageEvent } from "@/lib/server/access";
import { ensureAppSchema } from "@/lib/server/schema";
import { currencyForCity } from "@/lib/catalog";
import { mapEvent, type EventRow } from "@/lib/server/events";
import type { BodyBlock } from "@/lib/types";

const blockSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("h"), text: z.string().max(80) }),
  z.object({ type: z.literal("p"), text: z.string().max(2000) }),
  z.object({ type: z.literal("quote"), text: z.string().max(500) }),
  z.object({ type: z.literal("ul"), items: z.array(z.string().max(120)).max(12) }),
  z.object({ type: z.literal("img"), src: z.string().max(1_500_000), caption: z.string().max(80).default("") }),
]);

export const getEditEvent = createServerFn({ method: "POST" })
  .validator((data: unknown) => z.object({ eventId: z.string().min(1) }).parse(data))
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    await ensureAppSchema();
    await requireManageEvent(context.userId, data.eventId);
    const sql = await getSql();
    const rows = await sql.query<EventRow>(
      `select e.id, e.slug, e.title, e.subtitle, e.category, e.city, e.venue, e.address,
              e.starts_at, e.ends_at, e.currency, e.price, e.capacity, e.sold,
              '' as cover_url, e.description, e.highlights, e.host_name, e.host_note,
              e.level, e.club_id, e.user_id, e.open, e.lat, e.lng, e.body,
              e.whatsapp, e.wechat_qr, e.alipay_qr, e.tng_qr
       from events e
       where e.id = $1
       limit 1`,
      [data.eventId],
    );
    if (!rows[0]) return null;
    const event = mapEvent(rows[0]);
    return { ...event, coverUrl: `/api/media/${event.slug}?kind=cover` };
  });

export const saveEventEdits = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z.object({
      eventId: z.string().min(1),
      clubId: z.string().min(1),
      title: z.string().trim().min(2).max(40),
      subtitle: z.string().trim().max(60).default(""),
      category: z.string().min(1),
      city: z.enum(["penang", "kl", "jb", "singapore", "bangkok"]),
      venue: z.string().trim().min(2).max(80),
      address: z.string().trim().min(2).max(200),
      lat: z.number().nullable().optional(),
      lng: z.number().nullable().optional(),
      startsAt: z.string().min(1),
      endsAt: z.string().min(1),
      price: z.number().min(0).max(9999),
      capacity: z.number().int().min(2).max(200),
      coverUrl: z.string().max(1_500_000),
      description: z.string().trim().max(2000).default(""),
      highlights: z.array(z.string().max(80)).max(8).default([]),
      hostNote: z.string().trim().max(80).default(""),
      level: z.enum(["newbie", "all", "intermediate"]).default("all"),
      body: z.array(blockSchema).max(24).default([]),
    }).parse(data),
  )
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    await ensureAppSchema();
    await requireManageEvent(context.userId, data.eventId);
    await requireManageClub(context.userId, data.clubId);
    const sql = await getSql();
    const owned = await sql<{ id: string; booked: number }>`
      select e.id, coalesce(r.n, 0)::int as booked
      from events e
      left join (
        select event_id, sum(seats)::int as n from registrations
        where payment_status in ('approved','paid') group by event_id
      ) r on r.event_id = e.id
      where e.id = ${data.eventId}
      limit 1
    `;
    if (!owned[0]) throw new Error("没有这场活动");
    if (data.capacity < owned[0].booked) throw new Error(`人数上限不能小于已录取的 ${owned[0].booked} 人`);
    const starts = new Date(data.startsAt);
    const ends = new Date(data.endsAt);
    if (Number.isNaN(starts.getTime()) || Number.isNaN(ends.getTime()) || ends <= starts) {
      throw new Error("时间不正确");
    }
    const replaceCover = data.coverUrl.startsWith("data:image");
    const body = data.body as BodyBlock[];
    const gallery = body.filter((b) => b.type === "img" && b.caption === "gallery").length;
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
        currency = ${currencyForCity(data.city)},
        price = ${data.price},
        capacity = ${data.capacity},
        cover_url = case when ${replaceCover} then ${data.coverUrl} else cover_url end,
        description = ${data.description},
        highlights = ${JSON.stringify(data.highlights)},
        host_note = ${data.hostNote},
        level = ${data.level},
        club_id = ${data.clubId},
        body = ${JSON.stringify(body)},
        gallery_count = ${gallery}
      where id = ${data.eventId}
    `;
    return { id: data.eventId };
  });
