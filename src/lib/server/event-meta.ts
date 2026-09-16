import { getSql } from "@/lib/db";
import { ensureAppSchema } from "@/lib/server/schema";
import { mapEvent, type EventRow } from "@/lib/server/events";
import { parseBodySafe } from "@/lib/server/event-media-parse";
import { GALLERY_CAPTION } from "@/components/event-form";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { BodyBlock, EventRecord } from "@/lib/types";

const metaSelect = `
  select
    e.id, e.slug, e.title, e.subtitle, e.category, e.city, e.venue, e.address,
    e.lat, e.lng, e.starts_at, e.ends_at, e.currency, e.price, e.capacity, e.sold,
    '' as cover_url,
    left(coalesce(e.description, ''), 2000) as description,
    e.highlights, e.host_name, e.host_note, e.level,
    e.club_id, e.user_id, e.open, e.whatsapp,
    coalesce(e.refund_hours, 24) as refund_hours,
    coalesce(e.refund_fee_percent, 50) as refund_fee_percent,
    coalesce(e.gallery_count, 0) as gallery_count,
    c.name as club_name,
    coalesce(r.paid_seats, 0) as paid_seats,
    '[]' as body
  from events e
  left join clubs c on c.id = e.club_id
  left join (
    select event_id, sum(seats)::int as paid_seats
    from registrations
    where payment_status in ('approved', 'paid')
    group by event_id
  ) r on r.event_id = e.id
`;

export type PublicEvent = EventRecord & {
  refundHours: number;
  refundFeePercent: number;
  galleryCount: number;
  myApply?: { status: string; code: string } | null;
};

function fromRow(row: EventRow & { refund_hours?: number | string | null; refund_fee_percent?: number | string | null; gallery_count?: number | string | null }): PublicEvent {
  const event = mapEvent(row);
  const galleryCount = Number(row.gallery_count) || 0;
  const extras: BodyBlock[] = Array.from({ length: galleryCount }, (_, n) => ({
    type: "img",
    src: `/api/media/${event.slug}?kind=gallery&n=${n}`,
    caption: GALLERY_CAPTION,
  }));
  return {
    ...event,
    coverUrl: `/api/media/${event.slug}?kind=cover`,
    wechatQr: `/api/media/${event.slug}?kind=wechat`,
    alipayQr: `/api/media/${event.slug}?kind=alipay`,
    tngQr: `/api/media/${event.slug}?kind=tng`,
    body: extras,
    refundHours: Number(row.refund_hours) || 24,
    refundFeePercent: Number(row.refund_fee_percent) || 50,
    galleryCount,
  };
}

export async function loadEventMetaBySlug(slug: string): Promise<PublicEvent | null> {
  await ensureAppSchema();
  const sql = await getSql();
  try {
    const rows = await sql.query<EventRow & { refund_hours?: number; refund_fee_percent?: number; gallery_count?: number }>(
      `${metaSelect} where e.slug = $1 limit 1`,
      [slug],
    );
    return rows[0] ? fromRow(rows[0]) : null;
  } catch {
    const rows = await sql.query<EventRow>(
      `select e.id, e.slug, e.title, e.subtitle, e.category, e.city, e.venue, e.address,
        e.lat, e.lng, e.starts_at, e.ends_at, e.currency, e.price, e.capacity, e.sold,
        '' as cover_url, left(coalesce(e.description,''),2000) as description,
        e.highlights, e.host_name, e.host_note, e.level, e.club_id, e.user_id, e.open, e.whatsapp,
        c.name as club_name, coalesce(r.paid_seats,0) as paid_seats, '[]' as body
       from events e
       left join clubs c on c.id = e.club_id
       left join (
         select event_id, sum(seats)::int as paid_seats from registrations
         where payment_status in ('approved','paid') group by event_id
       ) r on r.event_id = e.id
       where e.slug = $1 limit 1`,
      [slug],
    );
    return rows[0] ? fromRow({ ...rows[0], refund_hours: 24, refund_fee_percent: 50, gallery_count: 0 }) : null;
  }
}

export async function loadEventMetaById(id: string): Promise<PublicEvent | null> {
  await ensureAppSchema();
  const sql = await getSql();
  try {
    const rows = await sql.query<EventRow & { refund_hours?: number; refund_fee_percent?: number; gallery_count?: number }>(
      `${metaSelect} where e.id = $1 limit 1`,
      [id],
    );
    return rows[0] ? fromRow(rows[0]) : null;
  } catch {
    return null;
  }
}

export const getEventIntro = createServerFn({ method: "GET" })
  .validator((data: unknown) => z.object({ slug: z.string().min(1) }).parse(data))
  .handler(async ({ data }): Promise<BodyBlock[]> => {
    const sql = await getSql();
    const rows = await sql.query<{ body: string | null }>(`select body from events where slug = $1 limit 1`, [data.slug]);
    const blocks = parseBodySafe(rows[0]?.body);
    let n = 0;
    return blocks
      .filter((block) => !(block.type === "img" && block.caption === GALLERY_CAPTION))
      .map((block) => {
        if (block.type !== "img") return block;
        return { ...block, src: `/api/media/${data.slug}?kind=bodyimg&n=${n++}` };
      });
  });
