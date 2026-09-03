import { getSql } from "@/lib/db";
import { ensureAppSchema } from "@/lib/server/schema";
import { mapEvent, type EventRow } from "@/lib/server/events";
import { parseBodySafe } from "@/lib/server/event-media-parse";
import { GALLERY_CAPTION } from "@/components/event-form";
import type { EventRecord } from "@/lib/types";

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
    c.name as club_name,
    coalesce(r.paid_seats, 0) as paid_seats,
    coalesce((
      select jsonb_agg(
        case
          when elem->>'type' = 'img' then jsonb_build_object(
            'type', 'img',
            'caption', coalesce(elem->>'caption', ''),
            'src', ''
          )
          else elem
        end
      )
      from jsonb_array_elements(
        case
          when e.body is null or btrim(e.body) = '' then '[]'::jsonb
          else e.body::jsonb
        end
      ) elem
    )::text, '[]') as body
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
  myApply?: { status: string; code: string } | null;
};

function attachMedia(event: EventRecord, refundHours: number, refundFeePercent: number): PublicEvent {
  const blocks = parseBodySafe(JSON.stringify(event.body));
  let galleryN = 0;
  let bodyN = 0;
  const body = blocks.map((block) => {
    if (block.type !== "img") return block;
    const gallery = block.caption === GALLERY_CAPTION;
    const src = gallery
      ? `/api/media/${event.slug}?kind=gallery&n=${galleryN++}`
      : `/api/media/${event.slug}?kind=bodyimg&n=${bodyN++}`;
    return { ...block, src };
  });
  return {
    ...event,
    coverUrl: `/api/media/${event.slug}?kind=cover`,
    wechatQr: `/api/media/${event.slug}?kind=wechat`,
    alipayQr: `/api/media/${event.slug}?kind=alipay`,
    tngQr: `/api/media/${event.slug}?kind=tng`,
    body,
    refundHours,
    refundFeePercent,
  };
}

function fromRow(row: EventRow & { refund_hours?: number | string | null; refund_fee_percent?: number | string | null }): PublicEvent {
  const event = mapEvent(row);
  return attachMedia(event, Number(row.refund_hours) || 24, Number(row.refund_fee_percent) || 50);
}

export async function loadEventMetaBySlug(slug: string): Promise<PublicEvent | null> {
  await ensureAppSchema();
  const sql = await getSql();
  try {
    const rows = await sql.query<EventRow & { refund_hours?: number; refund_fee_percent?: number }>(
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
    return rows[0] ? fromRow({ ...rows[0], refund_hours: 24, refund_fee_percent: 50 }) : null;
  }
}

export async function loadEventMetaById(id: string): Promise<PublicEvent | null> {
  await ensureAppSchema();
  const sql = await getSql();
  const rows = await sql.query<EventRow & { refund_hours?: number; refund_fee_percent?: number }>(
    `${metaSelect} where e.id = $1 limit 1`,
    [id],
  );
  return rows[0] ? fromRow(rows[0]) : null;
}
