import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import { requireManageClub, requireManageEvent } from "@/lib/server/access";
import { ensureAppSchema } from "@/lib/server/schema";
import { currencyForCity } from "@/lib/catalog";
import { countGallery, isGalleryImage } from "@/lib/server/event-media-parse";
import { resolveMediaSrc } from "@/lib/server/event-media";
import { mapEvent, type EventRow } from "@/lib/server/events";
import type { BodyBlock } from "@/lib/types";

const blockSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("h"), text: z.string().max(80) }),
  z.object({ type: z.literal("p"), text: z.string().max(2000) }),
  z.object({ type: z.literal("quote"), text: z.string().max(500) }),
  z.object({ type: z.literal("ul"), items: z.array(z.string().max(120)).max(12) }),
  z.object({ type: z.literal("img"), src: z.string().max(1_500_000), caption: z.string().max(80).default("") }),
]);

function clientCover(slug: string, coverUrl: string) {
  if (coverUrl.startsWith("data:")) return `/api/media/${slug}?kind=cover`;
  return coverUrl;
}

function clientBody(slug: string, body: BodyBlock[]) {
  let galleryN = 0;
  let bodyN = 0;
  return body.map((block) => {
    if (block.type !== "img" || !block.src?.startsWith("data:")) return block;
    const src = isGalleryImage(block)
      ? `/api/media/${slug}?kind=gallery&n=${galleryN++}`
      : `/api/media/${slug}?kind=bodyimg&n=${bodyN++}`;
    return { ...block, src };
  });
}

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
              e.cover_url, e.description, e.highlights, e.host_name, e.host_note,
              e.level, e.club_id, e.user_id, e.open, e.lat, e.lng, e.body,
              e.whatsapp, e.wechat_qr, e.alipay_qr, e.tng_qr,
              coalesce(e.refund_hours, 24) as refund_hours,
              coalesce(e.refund_fee_percent, 50) as refund_fee_percent
       from events e
       where e.id = $1
       limit 1`,
      [data.eventId],
    );
    if (!rows[0]) return null;
    const event = mapEvent(rows[0]);
    const extra = rows[0] as EventRow & { refund_hours?: number | string; refund_fee_percent?: number | string };
    return {
      ...event,
      coverUrl: clientCover(event.slug, event.coverUrl),
      body: clientBody(event.slug, event.body),
      refundHours: Number(extra.refund_hours) || 24,
      refundFeePercent: Number(extra.refund_fee_percent) || 50,
    };
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
      refundHours: z.number().int().min(0).max(168).optional(),
      refundFeePercent: z.number().int().min(0).max(100).optional(),
    }).parse(data),
  )
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    await ensureAppSchema();
    await requireManageEvent(context.userId, data.eventId);
    await requireManageClub(context.userId, data.clubId);
    const sql = await getSql();
    const owned = await sql<{ id: string; slug: string; booked: number; cover_url: string }>`
      select e.id, e.slug, e.cover_url, coalesce(r.n, 0)::int as booked
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
    const coverUrl = data.coverUrl ? await resolveMediaSrc(data.coverUrl) : "";
    const resolvedBody: BodyBlock[] = [];
    for (const block of data.body as BodyBlock[]) {
      if (block.type !== "img") {
        resolvedBody.push(block);
        continue;
      }
      resolvedBody.push({ ...block, src: await resolveMediaSrc(block.src) });
    }
    const nextCover = coverUrl || owned[0].cover_url;
    const gallery = countGallery(resolvedBody);
    const refundHours = data.refundHours ?? 24;
    const refundFeePercent = data.refundFeePercent ?? 50;
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
        cover_url = ${nextCover},
        description = ${data.description},
        highlights = ${JSON.stringify(data.highlights)},
        host_note = ${data.hostNote},
        level = ${data.level},
        club_id = ${data.clubId},
        body = ${JSON.stringify(resolvedBody)},
        gallery_count = ${gallery},
        refund_hours = ${refundHours},
        refund_fee_percent = ${refundFeePercent}
      where id = ${data.eventId}
    `;
    return { id: data.eventId, slug: owned[0].slug };
  });
