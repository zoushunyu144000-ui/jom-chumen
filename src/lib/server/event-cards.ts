import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";
import { ensureSeeded, mapEvent, type EventRow } from "@/lib/server/events";
import { ensureAppSchema } from "@/lib/server/schema";
import type { EventRecord } from "@/lib/types";

let seeded = false;
async function seedOnce() {
  if (seeded) return;
  await ensureAppSchema();
  await ensureSeeded();
  seeded = true;
}

const cardSelect = `
  select
    e.id, e.slug, e.title, e.subtitle, e.category, e.city, e.venue, e.address,
    e.starts_at, e.ends_at, e.currency, e.price, e.capacity, e.sold,
    '' as cover_url,
    left(coalesce(e.description, ''), 120) as description,
    '[]' as highlights,
    e.host_name, e.host_note, e.level, e.club_id, e.user_id, e.open,
    e.lat, e.lng, c.name as club_name,
    coalesce(r.paid_seats, 0) as paid_seats
  from events e
  left join clubs c on c.id = e.club_id
  left join (
    select event_id, sum(seats)::int as paid_seats
    from registrations
    where payment_status in ('approved', 'paid')
    group by event_id
  ) r on r.event_id = e.id
`;

export const listEventCards = createServerFn({ method: "GET" }).handler(
  async (): Promise<EventRecord[]> => {
    await seedOnce();
    const sql = await getSql();
    const rows = await sql.query<EventRow>(`${cardSelect} order by e.starts_at asc`);
    return rows.map((row) => {
      const event = mapEvent(row);
      return {
        ...event,
        coverUrl: `/api/media/${event.slug}?kind=cover`,
        body: [],
        wechatQr: "",
        alipayQr: "",
        tngQr: "",
        whatsapp: "",
      };
    });
  },
);
